import { diffDataTableSchema, findSchemaIncompatibility } from '../data-table-compat';

const packageColumns = [
	{ name: 'email', type: 'string' as const, index: 0 },
	{ name: 'age', type: 'number' as const, index: 1 },
];

describe('findSchemaIncompatibility', () => {
	it('accepts an identical schema', () => {
		expect(
			findSchemaIncompatibility(packageColumns, [
				{ name: 'email', type: 'string' },
				{ name: 'age', type: 'number' },
			]),
		).toBeNull();
	});

	it('accepts a target with extra columns', () => {
		expect(
			findSchemaIncompatibility(packageColumns, [
				{ name: 'email', type: 'string' },
				{ name: 'age', type: 'number' },
				{ name: 'extra', type: 'boolean' },
			]),
		).toBeNull();
	});

	it('ignores column order and index', () => {
		expect(
			findSchemaIncompatibility(packageColumns, [
				{ name: 'age', type: 'number' },
				{ name: 'email', type: 'string' },
			]),
		).toBeNull();
	});

	it('reports package columns missing from the target', () => {
		expect(findSchemaIncompatibility(packageColumns, [{ name: 'email', type: 'string' }])).toEqual({
			missingColumns: ['age'],
			typeMismatches: [],
		});
	});

	it('reports columns whose target type differs', () => {
		expect(
			findSchemaIncompatibility(packageColumns, [
				{ name: 'email', type: 'string' },
				{ name: 'age', type: 'string' },
			]),
		).toEqual({
			missingColumns: [],
			typeMismatches: [{ column: 'age', expectedType: 'number', actualType: 'string' }],
		});
	});

	it('matches column names case-sensitively', () => {
		expect(
			findSchemaIncompatibility(packageColumns, [
				{ name: 'Email', type: 'string' },
				{ name: 'age', type: 'number' },
			]),
		).toEqual({
			missingColumns: ['email'],
			typeMismatches: [],
		});
	});

	it('reports missing and mismatched columns together', () => {
		expect(findSchemaIncompatibility(packageColumns, [{ name: 'age', type: 'date' }])).toEqual({
			missingColumns: ['email'],
			typeMismatches: [{ column: 'age', expectedType: 'number', actualType: 'date' }],
		});
	});
});

describe('diffDataTableSchema', () => {
	const packageTable = { id: 'dt1', name: 'Customers', columns: packageColumns };

	it('reports no changes for an identical table', () => {
		expect(
			diffDataTableSchema(packageTable, {
				name: 'Customers',
				columns: [
					{ name: 'email', type: 'string', index: 0 },
					{ name: 'age', type: 'number', index: 1 },
				],
			}),
		).toEqual([]);
	});

	it('lists every change in the order the import applies them', () => {
		expect(
			diffDataTableSchema(packageTable, {
				name: 'Orders',
				columns: [
					{ name: 'age', type: 'string', index: 0 },
					{ name: 'extra', type: 'boolean', index: 1 },
				],
			}),
		).toEqual([
			{ kind: 'remove-column', column: 'extra', type: 'boolean', destructive: true },
			{
				kind: 'change-column-type',
				column: 'age',
				from: 'string',
				to: 'number',
				destructive: true,
			},
			{ kind: 'add-column', column: 'email', type: 'string', destructive: false },
			{ kind: 'reorder-columns', destructive: false },
			{ kind: 'rename-table', from: 'Orders', to: 'Customers', destructive: false },
		]);
	});

	it('treats a column that differs only in case as removed and added', () => {
		expect(
			diffDataTableSchema(packageTable, {
				name: 'Customers',
				columns: [
					{ name: 'Email', type: 'string', index: 0 },
					{ name: 'age', type: 'number', index: 1 },
				],
			}),
		).toEqual([
			{ kind: 'remove-column', column: 'Email', type: 'string', destructive: true },
			{ kind: 'add-column', column: 'email', type: 'string', destructive: false },
		]);
	});

	it('reports a reorder when the target has a gap in its column positions', () => {
		expect(
			diffDataTableSchema(packageTable, {
				name: 'Customers',
				columns: [
					{ name: 'email', type: 'string', index: 0 },
					{ name: 'age', type: 'number', index: 2 },
				],
			}),
		).toEqual([{ kind: 'reorder-columns', destructive: false }]);
	});
});
