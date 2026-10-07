import { UserError } from 'n8n-workflow';

import {
	buildLakebaseQuery,
	quotePostgrestComponent,
	type LakebaseQueryInput,
} from '../actions/lakebase/conditions';

const query = (overrides: Partial<LakebaseQueryInput> = {}) =>
	buildLakebaseQuery({
		where: [],
		combineConditions: 'AND',
		sort: [],
		outputColumns: [],
		...overrides,
	});

describe('Lakebase -> condition translation', () => {
	describe('quotePostgrestComponent', () => {
		it.each([
			['a plain word', 'alice', 'alice'],
			['digits', '42', '42'],
			['a comma', 'a,b', '"a,b"'],
			['a full stop', 'a.b', '"a.b"'],
			['brackets', 'a(b)', '"a(b)"'],
			['an ampersand', 'a&b', '"a&b"'],
			['an equals sign', 'a=b', '"a=b"'],
			['a double quote', 'a"b', '"a\\"b"'],
			['a backslash', 'a\\b', '"a\\\\b"'],
			['both escapes at once', 'a\\"b', '"a\\\\\\"b"'],
		])('leaves or quotes %s', (_name, input, expected) => {
			expect(quotePostgrestComponent(input)).toBe(expected);
		});
	});

	describe('operators', () => {
		it.each([
			['eq', 'userId.eq.alice'],
			['neq', 'userId.neq.alice'],
			['gt', 'userId.gt.alice'],
			['gte', 'userId.gte.alice'],
			['lt', 'userId.lt.alice'],
			['lte', 'userId.lte.alice'],
			['like', 'userId.like.alice'],
			['ilike', 'userId.ilike.alice'],
		])('writes %s with its value', (condition, expected) => {
			expect(query({ where: [{ column: 'userId', condition, value: 'alice' }] })).toEqual({
				and: `(${expected})`,
			});
		});

		it.each([
			['is.null', 'userId.is.null'],
			['not.is.null', 'userId.not.is.null'],
		])('writes %s with no value segment', (condition, expected) => {
			expect(query({ where: [{ column: 'userId', condition, value: 'ignored' }] })).toEqual({
				and: `(${expected})`,
			});
		});

		it('rejects a condition that is not in the allow list', () => {
			expect(() => query({ where: [{ column: 'a', condition: 'drop', value: 'x' }] })).toThrow(
				UserError,
			);
		});

		it('skips a rule with no column', () => {
			expect(query({ where: [{ condition: 'eq', value: 'alice' }] })).toEqual({});
		});
	});

	describe('grouping', () => {
		it('keeps both conditions when one column is used twice', () => {
			const result = query({
				where: [
					{ column: 'price', condition: 'gte', value: '10' },
					{ column: 'price', condition: 'lt', value: '50' },
				],
			});

			expect(result).toEqual({ and: '(price.gte.10,price.lt.50)' });
		});

		it.each([
			['AND', 'and'],
			['OR', 'or'],
		])('groups under %s', (combineConditions, key) => {
			const result = query({
				where: [
					{ column: 'a', condition: 'eq', value: '1' },
					{ column: 'b', condition: 'eq', value: '2' },
				],
				combineConditions: combineConditions as 'AND' | 'OR',
			});

			expect(result).toEqual({ [key]: '(a.eq.1,b.eq.2)' });
		});

		it('quotes a value that would otherwise end the group', () => {
			expect(query({ where: [{ column: 'note', condition: 'eq', value: 'a,b(c)' }] })).toEqual({
				and: '(note.eq."a,b(c)")',
			});
		});
	});

	describe('order and select', () => {
		it('writes one order term per sort rule', () => {
			expect(
				query({
					sort: [
						{ column: 'price', direction: 'desc' },
						{ column: 'name', direction: 'asc' },
					],
				}),
			).toEqual({ order: 'price.desc,name.asc' });
		});

		it('rejects a sort direction that is not in the allow list', () => {
			expect(() => query({ sort: [{ column: 'price', direction: 'asc,injected.desc' }] })).toThrow(
				UserError,
			);
		});

		it('defaults a sort rule with no direction to asc', () => {
			expect(query({ sort: [{ column: 'price' }] })).toEqual({ order: 'price.asc' });
		});

		it('writes the selected columns', () => {
			expect(query({ outputColumns: ['sku', 'name'] })).toEqual({ select: 'sku,name' });
		});

		it('omits select when all columns are asked for', () => {
			expect(query({ outputColumns: ['*'] })).toEqual({});
		});

		it('omits every key when nothing is set', () => {
			expect(query()).toEqual({});
		});
	});
});
