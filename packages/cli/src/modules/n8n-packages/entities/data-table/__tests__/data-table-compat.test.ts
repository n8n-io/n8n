import {
	diffDataTableColumns,
	diffDataTableSchema,
	findSchemaIncompatibility,
} from '../data-table-compat';

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

	it('detects every kind of change and lists them in a fixed order', () => {
		expect(
			diffDataTableSchema(
				{
					id: 'dt1',
					name: 'Customers',
					columns: [
						{ id: 'c1', name: 'email', type: 'string', index: 0 },
						{ id: 'c2', name: 'age', type: 'number', index: 1 },
						{ id: 'c3', name: 'added', type: 'boolean', index: 2 },
					],
				},
				{
					name: 'Orders',
					columns: [
						{ id: 'c2', name: 'age', type: 'string', index: 0 },
						{ id: 'c1', name: 'mail', type: 'string', index: 1 },
						{ id: 'c9', name: 'extra', type: 'boolean', index: 2 },
					],
				},
			),
		).toEqual([
			{ kind: 'remove-column', column: 'extra', type: 'boolean', destructive: true },
			{
				kind: 'change-column-type',
				column: 'age',
				from: 'string',
				to: 'number',
				destructive: true,
			},
			{ kind: 'rename-column', from: 'mail', to: 'email', destructive: false },
			{ kind: 'add-column', column: 'added', type: 'boolean', destructive: false },
			{ kind: 'reorder-columns', destructive: false },
			{ kind: 'rename-table', from: 'Orders', to: 'Customers', destructive: false },
		]);
	});

	it('reports a renamed and retyped column as a rename and a type change', () => {
		expect(
			diffDataTableColumns(
				[{ id: 'c1', name: 'score', type: 'number', index: 0 }],
				[{ id: 'c1', name: 'points', type: 'string', index: 0 }],
			),
		).toEqual([
			{
				kind: 'change-column-type',
				column: 'score',
				from: 'string',
				to: 'number',
				destructive: true,
			},
			{ kind: 'rename-column', from: 'points', to: 'score', destructive: false },
		]);
	});

	it('reports a rename when a column takes the name of a removed column', () => {
		expect(
			diffDataTableColumns(
				[{ id: 'c1', name: 'b', type: 'string', index: 0 }],
				[
					{ id: 'c2', name: 'b', type: 'string', index: 0 },
					{ id: 'c1', name: 'a', type: 'string', index: 1 },
				],
			),
		).toEqual([
			{ kind: 'remove-column', column: 'b', type: 'string', destructive: true },
			{ kind: 'rename-column', from: 'a', to: 'b', destructive: false },
		]);
	});

	it('matches columns without an id by name', () => {
		expect(
			diffDataTableColumns(
				[
					{ id: 'c1', name: 'email', type: 'string', index: 0 },
					{ name: 'age', type: 'number', index: 1 },
				],
				[
					{ id: 'c1', name: 'mail', type: 'string', index: 0 },
					{ id: 'c2', name: 'age', type: 'number', index: 1 },
				],
			),
		).toEqual([{ kind: 'rename-column', from: 'mail', to: 'email', destructive: false }]);
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

	it('lists changes in column order when the target columns arrive unsorted', () => {
		expect(
			diffDataTableSchema(packageTable, {
				name: 'Customers',
				columns: [
					{ name: 'second', type: 'string', index: 3 },
					{ name: 'email', type: 'string', index: 0 },
					{ name: 'first', type: 'string', index: 2 },
					{ name: 'age', type: 'number', index: 1 },
				],
			}),
		).toEqual([
			{ kind: 'remove-column', column: 'first', type: 'string', destructive: true },
			{ kind: 'remove-column', column: 'second', type: 'string', destructive: true },
		]);
	});

	it('does not report a reorder when a middle column is removed', () => {
		expect(
			diffDataTableSchema(packageTable, {
				name: 'Customers',
				columns: [
					{ name: 'email', type: 'string', index: 0 },
					{ name: 'note', type: 'string', index: 1 },
					{ name: 'age', type: 'number', index: 2 },
				],
			}),
		).toEqual([{ kind: 'remove-column', column: 'note', type: 'string', destructive: true }]);
	});
});
