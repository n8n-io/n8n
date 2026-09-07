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
});
