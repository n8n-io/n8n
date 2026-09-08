import { normalizeColumn } from '../data-table-enum.utils';

describe('Data Table enum options', () => {
	it('normalizes enum options', () => {
		const column = normalizeColumn({
			name: 'priority',
			type: 'enum',
			options: [' Low ', 'High'],
		});

		expect(column.options).toMatchObject([
			{ text: 'Low', color: '#6366F1' },
			{ text: 'High', color: '#14B8A6' },
		]);
		expect(column.options?.every((option) => option.id.length > 0)).toBe(true);
	});

	it('rejects case-insensitive duplicate options', () => {
		expect(() =>
			normalizeColumn({
				name: 'priority',
				type: 'enum',
				options: ['High', 'high'],
			}),
		).toThrow('Enum option text must be unique');
	});

	it('normalizes a valid default value', () => {
		const column = normalizeColumn({
			name: 'priority',
			type: 'enum',
			options: ['Low', 'High'],
			defaultValue: ' Low ',
		});

		expect(column.defaultValue).toBe(column.options?.[0]?.id);
	});

	it('rejects a default value outside the options', () => {
		expect(() =>
			normalizeColumn({
				name: 'priority',
				type: 'enum',
				options: ['Low', 'High'],
				defaultValue: 'Medium',
			}),
		).toThrow('The enum default value must be one of its options');
	});
});
