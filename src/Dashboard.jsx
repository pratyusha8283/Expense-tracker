import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { signOut, updateProfile } from 'firebase/auth';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [category, setCategory] = useState('Food');
  const [transactions, setTransactions] = useState([]);
  
  const [displayName, setDisplayName] = useState(auth.currentUser?.displayName || '');
  const [profileMessage, setProfileMessage] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');

  const categories = ['Food', 'Shopping', 'Bills', 'Entertainment', 'Salary', 'Investment', 'Others'];
  
  // Generate list of months dynamically from January 2025 up to Current Month
  const generateMonthsRange = () => {
    const months = [];
    const startDate = new Date(2025, 0, 1); // January 2025
    const currentDate = new Date(); // Current date/month
    
    let tempDate = new Date(startDate);
    while (tempDate <= currentDate) {
      const monthYear = `${tempDate.toLocaleString('default', { month: 'long' })} ${tempDate.getFullYear()}`;
      months.push(monthYear);
      tempDate.setMonth(tempDate.getMonth() + 1);
    }
    return months.reverse(); // Latest month first
  };

  const allMonthsList = generateMonthsRange();

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, "transactions"),
      where("userId", "==", auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let items = [];
      snapshot.forEach((docSnap) => {
        items.push({ ...docSnap.data(), id: docSnap.id });
      });
      items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setTransactions(items);
    });

    return () => unsubscribe();
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      await updateProfile(auth.currentUser, { displayName });
      await setDoc(doc(db, "users", auth.currentUser.uid), {
        name: displayName,
        email: auth.currentUser.email
      }, { merge: true });
      setProfileMessage('Profile updated successfully!');
      setTimeout(() => setProfileMessage(''), 3000);
    } catch (err) {
      setProfileMessage('Error: ' + err.message);
    }
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!title || !amount) return;

    const dateObj = new Date();
    const monthYear = `${dateObj.toLocaleString('default', { month: 'long' })} ${dateObj.getFullYear()}`;

    try {
      await addDoc(collection(db, "transactions"), {
        title,
        amount: parseFloat(amount),
        type,
        category,
        monthYear,
        userId: auth.currentUser.uid,
        createdAt: dateObj.toISOString()
      });
      setTitle('');
      setAmount('');
    } catch (err) {
      console.error("Error adding transaction: ", err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, "transactions", id));
    } catch (err) {
      console.error("Error deleting: ", err);
    }
  };

  const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const expenses = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const totalBalance = income - expenses;

  // Filter transactions
  const filteredTransactions = selectedMonth === 'all' 
    ? transactions 
    : transactions.filter(t => t.monthYear === selectedMonth);

  // Calculate month-wise expense summary
  const monthlyExpenseSummary = allMonthsList.map(month => {
    const totalExp = transactions
      .filter(t => t.monthYear === month && t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);
    const totalInc = transactions
      .filter(t => t.monthYear === month && t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);
    return { month, totalExp, totalInc };
  });

  const pieData = [
    { name: 'Income', value: income },
    { name: 'Expense', value: expenses }
  ];
  const COLORS = ['#10B981', '#F43F5E'];

  const categoryData = categories.map(cat => {
    const total = transactions
      .filter(t => t.category === cat && t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);
    return { name: cat, amount: total };
  }).filter(c => c.amount > 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-12">
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center font-bold text-xl shadow-lg shadow-indigo-500/30">
              ₹
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                ExpenseFlow
              </h1>
              <p className="text-xs text-slate-400">Hi, {auth.currentUser?.displayName || 'User'}</p>
            </div>
          </div>

          <nav className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                activeTab === 'dashboard' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                activeTab === 'analytics' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Analytics
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                activeTab === 'profile' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Profile & Statement
            </button>
          </nav>

          <button
            onClick={() => signOut(auth)}
            className="text-sm font-medium bg-slate-800 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30 border border-slate-700 px-4 py-2 rounded-xl transition"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pt-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl">
                <p className="text-sm font-medium text-slate-400">Total Balance</p>
                <h2 className={`text-3xl font-extrabold mt-2 ${totalBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  ₹{totalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </h2>
              </div>
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl">
                <p className="text-sm font-medium text-slate-400">Total Income</p>
                <h2 className="text-3xl font-extrabold text-emerald-400 mt-2">
                  +₹{income.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </h2>
              </div>
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl">
                <p className="text-sm font-medium text-slate-400">Total Expenses</p>
                <h2 className="text-3xl font-extrabold text-rose-400 mt-2">
                  -₹{expenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl h-fit">
                <h3 className="text-lg font-semibold mb-5">New Transaction</h3>
                <form onSubmit={handleAddTransaction} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Groceries"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Amount (₹)</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Type</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold py-3 rounded-xl transition"
                  >
                    Add Entry
                  </button>
                </form>
              </div>

              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-3">
                  <h3 className="text-lg font-semibold">Transaction History</h3>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-xs rounded-xl px-3 py-2 text-slate-300 focus:outline-none"
                  >
                    <option value="all">All Months Archive</option>
                    {allMonthsList.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                {filteredTransactions.length === 0 ? (
                  <p className="text-slate-500 text-sm">No transactions found for this selection.</p>
                ) : (
                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
                    {filteredTransactions.map((t) => (
                      <div key={t.id} className="flex justify-between items-center p-4 bg-slate-950 border border-slate-800 rounded-xl">
                        <div>
                          <p className="font-semibold text-slate-200">{t.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                              {t.category || 'General'}
                            </span>
                            <span className="text-xs text-slate-500">{t.monthYear}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`font-bold ${t.type === 'income' ? 'text-emerald-400' : 'text-slate-200'}`}>
                            {t.type === 'income' ? '+' : '-'}₹{t.amount}
                          </span>
                          <button onClick={() => handleDelete(t.id)} className="text-slate-500 hover:text-rose-400" title="Delete record">✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-center">
              <h3 className="text-lg font-semibold mb-4">Income vs Expense</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value">
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-center">
              <h3 className="text-lg font-semibold mb-4">Expense by Category</h3>
              <div className="h-64">
                {categoryData.length === 0 ? (
                  <p className="text-slate-500 text-sm mt-20">Add expenses to view category breakdown.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData}>
                      <XAxis dataKey="name" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip />
                      <Bar dataKey="amount" fill="#6366f1" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-8 max-w-3xl mx-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-3">
                  {(auth.currentUser?.displayName || auth.currentUser?.email)?.[0]?.toUpperCase()}
                </div>
                <h2 className="text-xl font-bold">{auth.currentUser?.displayName || 'No Name Set'}</h2>
                <p className="text-slate-400 text-sm">{auth.currentUser?.email}</p>
              </div>

              {profileMessage && (
                <div className="mb-4 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs text-center">
                  {profileMessage}
                </div>
              )}

              <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md mx-auto">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">Edit Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl transition text-sm shadow-lg shadow-indigo-600/20"
                >
                  Update Profile Name
                </button>
              </form>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-lg font-semibold mb-2">Monthly Statements (Jan 2025 - Present)</h3>
              <p className="text-xs text-slate-400 mb-6">Detailed monthly breakdown starting from January 2025 up to the current month.</p>
              
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-2">
                {monthlyExpenseSummary.map((item) => (
                  <div key={item.month} className="flex justify-between items-center p-4 bg-slate-950 border border-slate-800/80 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center font-bold text-indigo-400 text-sm">
                        📅
                      </div>
                      <div>
                        <p className="font-semibold text-slate-200">{item.month}</p>
                        <p className="text-xs text-slate-500">Income: ₹{item.totalInc.toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-rose-400">-₹{item.totalExp.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider">Total Spent</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}