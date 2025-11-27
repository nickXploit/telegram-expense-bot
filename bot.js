const TelegramBot = require('node-telegram-bot-api');
const PDFDocument = require('pdfkit');
const fs = require('fs');

const token = '8173705996:AAEJ4j8Dr4wf1W3d8ls4_KfrOEPDYmF9qv0';
const bot = new TelegramBot(token, { polling: true });

const userExpenses = {};

function initUser(userId) {
  if (!userExpenses[userId]) {
    userExpenses[userId] = [];
  }
}

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  initUser(chatId);
  
bot.sendMessage(
  chatId,
  '🎯 *Welcome to Expense Tracker Bot!*\n\n' +
  '*Supported Categories:*\n' +
  'food, transport, grocery, emi, loan, smoking, other\n\n' +
  '*Commands:*\n' +
  '• Add expense: `add food 100`\n' +
  '• Add with note: `add transport 50 uber ride`\n' +
  '• View total: `total`\n' +
  '• View list: `list`\n' +
  '• Get PDF: `pdf`\n' +
  '• Clear all: `clear`\n' +
  '• Help: `help`',
  { parse_mode: 'Markdown' }
);
  
bot.onText(/^help$/i, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId,
    '📖 *How to use:*\n\n' +
    '*Adding expenses:*\n' +
    '`add food 100` - adds ₹100 to food\n' +
    '`add groceries 450 weekly shopping` - with note\n\n' +
    '*Viewing expenses:*\n' +
    '`total` - shows total spent\n' +
    '`list` - shows all expenses\n' +
    '`pdf` - get PDF report\n\n' +
    '*Managing:*\n' +
    '`clear` - delete all expenses',
    { parse_mode: 'Markdown' }
  );
});

bot.onText(/^add\s+(\S+)\s+(\d+\.?\d*)(.*)$/i, (msg, match) => {
  const chatId = msg.chat.id;
  const category = match[1].toLowerCase();
  const amount = parseFloat(match[2]);
  const note = match[3].trim();
  
  initUser(chatId);
  
  const expense = {
    category,
    amount,
    note,
    date: new Date().toLocaleString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  };
  
  userExpenses[chatId].push(expense);
  
  let response = `✅ Added ₹${amount} to *${category}*`;
  if (note) response += `\n📝 Note: ${note}`;
  
  bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
});

bot.onText(/^total$/i, (msg) => {
  const chatId = msg.chat.id;
  initUser(chatId);
  
  if (userExpenses[chatId].length === 0) {
    bot.sendMessage(chatId, '📊 No expenses recorded yet!');
    return;
  }
  
  const total = userExpenses[chatId].reduce((sum, exp) => sum + exp.amount, 0);
  
  const categoryTotals = {};
  userExpenses[chatId].forEach(exp => {
    categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
  });
  
  let response = `💰 *Total Expenses: ₹${total.toFixed(2)}*\n\n`;
  response += '*By Category:*\n';
  
  Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, amt]) => {
      response += `• ${cat}: ₹${amt.toFixed(2)}\n`;
    });
  
  bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
});

bot.onText(/^list$/i, (msg) => {
  const chatId = msg.chat.id;
  initUser(chatId);
  
  if (userExpenses[chatId].length === 0) {
    bot.sendMessage(chatId, '📋 No expenses to show!');
    return;
  }
  
  let response = '📋 *All Expenses:*\n\n';
  
  userExpenses[chatId].forEach((exp, i) => {
    response += `${i + 1}. *${exp.category}* - ₹${exp.amount}\n`;
    response += `   📅 ${exp.date}`;
    if (exp.note) response += `\n   📝 ${exp.note}`;
    response += '\n\n';
  });
  
  bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
});

bot.onText(/^pdf$/i, async (msg) => {
  const chatId = msg.chat.id;
  initUser(chatId);
  
  if (userExpenses[chatId].length === 0) {
    bot.sendMessage(chatId, '📄 No expenses to generate PDF!');
    return;
  }
  
  bot.sendMessage(chatId, '⏳ Generating PDF...');
  
  const doc = new PDFDocument({ margin: 50 });
  const filename = `expenses_${chatId}_${Date.now()}.pdf`;
  const stream = fs.createWriteStream(filename);
  
  doc.pipe(stream);
  
  doc.fontSize(24).text('Expense Report', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString('en-IN')}`, { align: 'center' });
  doc.moveDown(2);
  
  const total = userExpenses[chatId].reduce((sum, exp) => sum + exp.amount, 0);
  const categoryTotals = {};
  userExpenses[chatId].forEach(exp => {
    categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
  });
  
  doc.fontSize(16).text('Summary', { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(14).text(`Total Expenses: ₹${total.toFixed(2)}`, { bold: true });
  doc.moveDown();
  
  doc.fontSize(12).text('By Category:', { underline: true });
  Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, amt]) => {
      doc.text(`  • ${cat}: ₹${amt.toFixed(2)}`);
    });
  
  doc.moveDown(2);
  
  doc.fontSize(16).text('Detailed Expenses', { underline: true });
  doc.moveDown();
  
  userExpenses[chatId].forEach((exp, i) => {
    doc.fontSize(11);
    doc.text(`${i + 1}. ${exp.category.toUpperCase()} - ₹${exp.amount}`, { bold: true });
    doc.fontSize(9);
    doc.text(`   Date: ${exp.date}`);
    if (exp.note) {
      doc.text(`   Note: ${exp.note}`);
    }
    doc.moveDown(0.5);
  });
  
  doc.end();
  
  stream.on('finish', () => {
    bot.sendDocument(chatId, filename, {
      caption: `📄 Your expense report (Total: ₹${total.toFixed(2)})`
    }).then(() => {
      fs.unlinkSync(filename);
    });
  });
});

bot.onText(/^clear$/i, (msg) => {
  const chatId = msg.chat.id;
  
  bot.sendMessage(chatId, 
    '⚠️ Are you sure you want to delete all expenses?\n\nReply with "yes confirm" to proceed.',
    { parse_mode: 'Markdown' }
  );
});

bot.onText(/^yes confirm$/i, (msg) => {
  const chatId = msg.chat.id;
  const count = userExpenses[chatId] ? userExpenses[chatId].length : 0;
  
  userExpenses[chatId] = [];
  bot.sendMessage(chatId, `✅ Cleared ${count} expense(s)!`);
});

console.log('Bot is running...');

// Simple HTTP server for Koyeb health checks
const http = require('http');
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Bot is running!');
});
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`Health check server running on port ${PORT}`);
});
