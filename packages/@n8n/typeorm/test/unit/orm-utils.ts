import { OrmUtils } from '../../src/util/OrmUtils';
import { expect } from 'chai';

describe(`orm-utils`, () => {
	describe('parseSqlCheckExpression', () => {
		it('parses a simple CHECK constraint', () => {
			// Spaces between CHECK values
			expect(
				OrmUtils.parseSqlCheckExpression(
					`CREATE TABLE "foo_table" (
                        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                        "col" varchar CHECK("col" IN ('FOO', 'BAR', 'BAZ')) NOT NULL,
                        "some_other_col" integer NOT NULL
                        );`,
					'col',
				),
			).to.have.same.members(['FOO', 'BAR', 'BAZ']);

			// No spaces between CHECK values
			expect(
				OrmUtils.parseSqlCheckExpression(
					`CREATE TABLE "foo_table" (
                        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                        "col" varchar CHECK("col" IN ('FOO','BAR','BAZ')) NOT NULL,
                        "some_other_col" integer NOT NULL
                        );`,
					'col',
				),
			).to.have.same.members(['FOO', 'BAR', 'BAZ']);
		});

		it("returns undefined when the column doesn't have a CHECK", () => {
			expect(
				OrmUtils.parseSqlCheckExpression(
					`CREATE TABLE "foo_table" (
                        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                        "col" varchar NOT NULL,
                        "some_other_col" integer NOT NULL
                        );`,
					'col',
				),
			).to.equal(undefined);
		});

		it('parses a CHECK constraint with values containing special characters', () => {
			expect(
				OrmUtils.parseSqlCheckExpression(
					`CREATE TABLE "foo_table" (
                        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
                        "col" varchar CHECK("col" IN (
                                    'a,b', 
                                    ',c,', 
                                    'd''d', 
                                    '''e''', 
                                    'f'',''f', 
                                    ''')', 
                                    ')'''
                                )
                            ) NOT NULL,
                        "some_other_col" integer NOT NULL
                        );`,
					'col',
				),
			).to.have.same.members(['a,b', ',c,', "d'd", "'e'", "f','f", "')", ")'"]);
		});
	});
});
