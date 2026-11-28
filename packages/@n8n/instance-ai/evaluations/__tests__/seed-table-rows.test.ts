import { EvalTestCaseSchema } from '../harness/schema';

// Seeded Data Tables may carry synthetic rows, inserted when the seed is
// restored. Each row is checked against the table's declared columns at case
// load, so a typo fails the case before it runs.

const columns = [
	{ name: 'package_name', type: 'string' },
	{ name: 'price', type: 'number' },
	{ name: 'active', type: 'boolean' },
	{ name: 'starts_on', type: 'date' },
];

function caseWithRows(rows: unknown[]): Record<string, unknown> {
	return {
		conversation: [{ role: 'user', text: 'what does the trial cost?' }],
		complexity: 'simple',
		tags: [],
		processExpectations: ['answers from the price list'],
		seed: {
			mode: 'inline',
			dataTables: [{ id: 'dt-price-list-0001', name: 'price_list', columns, rows }],
		},
	};
}

function issues(rows: unknown[]): Array<{ path: string; message: string }> {
	const parsed = EvalTestCaseSchema.safeParse(caseWithRows(rows));
	if (parsed.success) return [];
	return parsed.error.issues.map((issue) => ({
		path: issue.path.join('.'),
		message: issue.message,
	}));
}

describe('seed data table rows', () => {
	it('keeps rows that match the columns', () => {
		const rows = [
			{ package_name: 'trial class', price: 0, active: true, starts_on: '2026-12-01' },
			{ package_name: 'duo package', price: 640, active: false, starts_on: null },
			{ package_name: 'summer bootcamp' },
		];

		const parsed = EvalTestCaseSchema.parse(caseWithRows(rows));

		const seed = parsed.seed?.mode === 'inline' ? parsed.seed : undefined;
		expect(seed?.dataTables[0].rows).toEqual(rows);
	});

	it('leaves a table without rows empty, as before', () => {
		const parsed = EvalTestCaseSchema.parse({
			...caseWithRows([]),
			seed: {
				mode: 'inline',
				dataTables: [{ id: 'dt-price-list-0001', name: 'price_list', columns }],
			},
		});

		const seed = parsed.seed?.mode === 'inline' ? parsed.seed : undefined;
		expect(seed?.dataTables[0].rows).toBeUndefined();
	});

	it('rejects a cell for a column the table does not declare', () => {
		expect(issues([{ package_name: 'trial', colour: 'red' }])).toEqual([
			{
				path: 'seed.dataTables.0.rows.0.colour',
				message: 'table "price_list" has no column "colour"',
			},
		]);
	});

	it.each([
		['price', 'free', 'number'],
		['active', 'yes', 'boolean'],
		['package_name', 3, 'string'],
		['starts_on', 'next week', 'date'],
		['starts_on', 20261201, 'date'],
	])('rejects %s = %j in a %s column', (column, value, type) => {
		const found = issues([{ [column]: value }]);

		expect(found).toHaveLength(1);
		expect(found[0].path).toBe(`seed.dataTables.0.rows.0.${column}`);
		expect(found[0].message).toContain(`${type} column`);
	});

	it.each([
		['an id shorter than 8 characters', { id: 'dt-1' }],
		['a name longer than 128 characters', { name: 'x'.repeat(129) }],
	])('rejects a seed table with %s, as the restore would', (_label, override) => {
		const testCase = caseWithRows([]);
		const seed = testCase.seed as { dataTables: Array<Record<string, unknown>> };
		const table = { ...seed.dataTables[0], ...override };

		const parsed = EvalTestCaseSchema.safeParse({
			...testCase,
			seed: { ...seed, dataTables: [table] },
		});

		expect(parsed.success).toBe(false);
	});

	it('rejects more than 1000 rows', () => {
		const rows = Array.from({ length: 1001 }, () => ({ price: 1 }));

		expect(issues(rows)).not.toEqual([]);
	});
});
