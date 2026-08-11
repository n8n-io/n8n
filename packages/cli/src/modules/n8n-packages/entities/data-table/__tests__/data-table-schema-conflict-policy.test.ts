import { findSchemaConflict } from '../data-table-schema-conflict-policy';

const packageColumns = [
	{ name: 'email', type: 'string' as const, index: 0 },
	{ name: 'age', type: 'number' as const, index: 1 },
];

const identicalTarget = [
	{ name: 'email', type: 'string' },
	{ name: 'age', type: 'number' },
];

const supersetTarget = [...identicalTarget, { name: 'extra', type: 'boolean' }];

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
					{ name: 'age', type: 'date' },
					{ name: 'extra', type: 'boolean' },
				]),
			).toEqual({
				missingColumns: ['email'],
				typeMismatches: [{ column: 'age', expectedType: 'number', actualType: 'date' }],
				extraColumns: ['extra'],
			});
		});

		it('still rejects a missing column even without extras', () => {
			expect(
				findSchemaConflict('fail', packageColumns, [{ name: 'email', type: 'string' }]),
			).toEqual({
				missingColumns: ['age'],
				typeMismatches: [],
			});
		});
	});
});
