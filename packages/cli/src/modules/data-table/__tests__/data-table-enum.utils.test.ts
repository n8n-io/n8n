import { normalizeColumn } from '../data-table-enum.utils';

describe('Data Table enum options', () => {
	it('normalizes enum options', () => {
		const column = normalizeColumn({
			name: 'priority',
			type: 'enum',
			options: [' Low ', 'High'],
		});

		expect(column.options).toEqual(['Low', 'High']);
	});

	it('rejects case-insensitive duplicate options', () => {
		expect(() =>
			normalizeColumn({
				name: 'priority',
				type: 'enum',
				options: ['High', 'high'],
			}),
		).toThrow('Enum options must be unique');
	});

	it('normalizes a valid default value', () => {
		const column = normalizeColumn({
			name: 'priority',
			type: 'enum',
			options: ['Low', 'High'],
			defaultValue: ' Low ',
		});

		expect(column.defaultValue).toBe('Low');
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
