import { deriveBindingKey } from './bindingKey';

describe('deriveBindingKey', () => {
	it.each([
		['Sync social stats', 'workflow', 'syncSocialStats'],
		['Weekly channel activity', 'dataTable', 'weeklyChannelActivity'],
		['CRM Data', 'dataTable', 'crmData'],
		['support-bot_v2', 'agent', 'supportBotV2'],
		['Café menü', 'dataTable', 'cafeMenu'],
		['Mañana', 'workflow', 'manana'],
		['Naïve Bayes', 'agent', 'naiveBayes'],
		['2024 report', 'dataTable', 'table2024Report'],
		['!!!', 'agent', 'agent'],
		['', 'workflow', 'workflow'],
	] as const)('derives a key from "%s"', (name, kind, key) => {
		expect(deriveBindingKey(name, kind, [])).toBe(key);
	});

	it('adds a number when the key is taken', () => {
		expect(deriveBindingKey('Orders', 'dataTable', ['orders', 'orders2'])).toBe('orders3');
	});

	it('keeps the key within 64 characters, also with a number', () => {
		const name = 'a'.repeat(80);

		expect(deriveBindingKey(name, 'workflow', [])).toHaveLength(64);
		expect(deriveBindingKey(name, 'workflow', ['a'.repeat(64)])).toBe(`${'a'.repeat(63)}2`);
	});
});
