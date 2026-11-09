import { findSchemaConflict } from '../data-table-schema-conflict-policy';

const packageColumns = [
	{ name: 'email', type: 'string' as const, index: 0 },
	{ name: 'age', type: 'number' as const, index: 1 },
];

const identicalTarget = [
	{ name: 'email', type: 'string' as const, index: 0 },
	{ name: 'age', type: 'number' as const, index: 1 },
];

const supersetTarget = [...identicalTarget, { name: 'extra', type: 'boolean' as const, index: 2 }];

describe('findSchemaConflict', () => {
	describe('keep-existing', () => {
		it('accepts an identical schema', () => {
			expect(findSchemaConflict('keep-existing', packageColumns, identicalTarget)).toBeNull();
		});

		it('tolerates extra target columns', () => {
			expect(findSchemaConflict('keep-existing', packageColumns, supersetTarget)).toBeNull();
		});
	});

	describe('fail (strict drift detection)', () => {
		it('accepts an identical schema', () => {
			expect(findSchemaConflict('fail', packageColumns, identicalTarget)).toBeNull();
		});

		it('rejects extra target columns, naming them', () => {
			expect(findSchemaConflict('fail', packageColumns, supersetTarget)).toEqual({
				missingColumns: [],
				typeMismatches: [],
				extraColumns: ['extra'],
			});
		});

		it('combines extra columns with missing and mismatched ones', () => {
			expect(
				findSchemaConflict('fail', packageColumns, [
					{ name: 'age', type: 'date', index: 0 },
					{ name: 'extra', type: 'boolean', index: 1 },
				]),
			).toEqual({
				missingColumns: ['email'],
				typeMismatches: [{ column: 'age', expectedType: 'number', actualType: 'date' }],
				extraColumns: ['extra'],
			});
		});

		it('lists extra columns in column order when the target columns arrive unsorted', () => {
			expect(
				findSchemaConflict('fail', packageColumns, [
					{ name: 'second', type: 'string', index: 3 },
					{ name: 'email', type: 'string', index: 0 },
					{ name: 'first', type: 'string', index: 2 },
					{ name: 'age', type: 'number', index: 1 },
				]),
			).toEqual({ missingColumns: [], typeMismatches: [], extraColumns: ['first', 'second'] });
		});

		it('still rejects a missing column even without extras', () => {
			expect(
				findSchemaConflict('fail', packageColumns, [{ name: 'email', type: 'string', index: 0 }]),
			).toEqual({
				missingColumns: ['age'],
				typeMismatches: [],
			});
		});
	});

	describe('overwrite-non-destructive', () => {
		it('blocks columns that swap their names and types', () => {
			expect(
				findSchemaConflict(
					'overwrite-non-destructive',
					[
						{ id: 'c1', name: 'b', type: 'number', index: 0 },
						{ id: 'c2', name: 'a', type: 'string', index: 1 },
					],
					[
						{ id: 'c1', name: 'a', type: 'string', index: 0 },
						{ id: 'c2', name: 'b', type: 'number', index: 1 },
					],
				),
			).toEqual({
				missingColumns: [],
				typeMismatches: [
					{ column: 'b', expectedType: 'number', actualType: 'string' },
					{ column: 'a', expectedType: 'string', actualType: 'number' },
				],
			});
		});

		it('reports a renamed and retyped column as a type change on its new name', () => {
			expect(
				findSchemaConflict(
					'overwrite-non-destructive',
					[{ id: 'c1', name: 'score', type: 'number', index: 0 }],
					[{ id: 'c1', name: 'points', type: 'string', index: 0 }],
				),
			).toEqual({
				missingColumns: [],
				typeMismatches: [{ column: 'score', expectedType: 'number', actualType: 'string' }],
			});
		});

		it('blocks the removal of a column when a renamed column takes its name', () => {
			expect(
				findSchemaConflict(
					'overwrite-non-destructive',
					[
						{ id: 'c1', name: 'b', type: 'string', index: 0 },
						{ id: 'c3', name: 'a', type: 'string', index: 1 },
					],
					[
						{ id: 'c1', name: 'a', type: 'string', index: 0 },
						{ id: 'c2', name: 'b', type: 'string', index: 1 },
					],
				),
			).toEqual({ missingColumns: [], typeMismatches: [], extraColumns: ['b'] });
		});
	});
});
