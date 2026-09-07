import { dataTableCreateColumnSchema } from '../schemas/data-table.schema';

describe('dataTableCreateColumnSchema', () => {
	it('normalizes enum options', () => {
		expect(
			dataTableCreateColumnSchema.parse({
				name: 'priority',
				type: 'enum',
				options: [' Low ', 'High'],
			}),
		).toEqual({
			name: 'priority',
			type: 'enum',
			options: ['Low', 'High'],
		});
	});

	it('requires options for enum columns', () => {
		expect(dataTableCreateColumnSchema.safeParse({ name: 'priority', type: 'enum' }).success).toBe(
			false,
		);
	});

	it('rejects duplicate enum options without case sensitivity', () => {
		expect(
			dataTableCreateColumnSchema.safeParse({
				name: 'priority',
				type: 'enum',
				options: ['High', 'high'],
			}).success,
		).toBe(false);
	});

	it('rejects options on other column types', () => {
		expect(
			dataTableCreateColumnSchema.safeParse({
				name: 'title',
				type: 'string',
				options: ['One'],
			}).success,
		).toBe(false);
	});
});
