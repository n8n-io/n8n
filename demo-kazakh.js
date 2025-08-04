#!/usr/bin/env node

// Nurx қазақ тілінің демосы
// Nurx Kazakh language demonstration

console.log('🇰🇿 Nurx - Қазақстандағы алғашқы автоматтандыру жүйесі');
console.log('==================================================');
console.log('');

// Kazakh translations demo
const translations = {
  'mainSidebar.workflows': 'Жұмыс ағындары',
  'mainSidebar.credentials': 'Куәліктер', 
  'mainSidebar.executions': 'Орындаулар',
  'mainSidebar.settings': 'Баптаулар',
  'generic.create': 'Жасау',
  'generic.save': 'Сақтау',
  'generic.cancel': 'Бас тарту',
  'generic.delete': 'Жою',
  'workflows.heading': 'Жұмыс ағындары',
  'nodeCreator.searchBar.placeholder': 'Түйінді іздеу...',
  'canvas.addFirstNode': 'Бірінші түйінді қосу',
  'aiAssistant.name': 'Көмекші',
  'auth.signin': 'Кіру',
  'auth.email': 'Электрондық пошта',
  'auth.password': 'Құпия сөз'
};

console.log('📋 Негізгі интерфейс аудармалары:');
console.log('-----------------------------');
Object.entries(translations).forEach(([key, translation]) => {
  console.log(`✅ ${key}: "${translation}"`);
});

console.log('');
console.log('📊 Статистика:');
console.log(`   • Аударылған кілттер: ${Object.keys(translations).length}`);
console.log(`   • Жалпы аудармалар: 360+`);
console.log(`   • Тіл: Қазақша (kk)`);
console.log(`   • Резерв тіл: Ағылшын (en)`);

console.log('');
console.log('🚀 Іске қосу:');
console.log('   npx nurx');
console.log('   http://localhost:5678');

console.log('');
console.log('✨ Nurx дайын! Қазақ тілінде автоматтандыруды бастаңыз!');