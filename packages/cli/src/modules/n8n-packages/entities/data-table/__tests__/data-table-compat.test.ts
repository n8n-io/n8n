import { findSchemaIncompatibility } from '../data-table-compat';

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
