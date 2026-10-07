import { findSchemaConflict } from '../data-table-schema-conflict-policy';

const packageColumns = [
	{ name: 'email', type: 'string' as const, index: 0 },
	{ name: 'age', type: 'number' as const, index: 1 },
];

const identicalTarget = [
	{ name: 'email', type: 'string', index: 0 },
	{ name: 'age', type: 'number', index: 1 },
];

const supersetTarget = [...identicalTarget, { name: 'extra', type: 'boolean', index: 2 }];

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
});
