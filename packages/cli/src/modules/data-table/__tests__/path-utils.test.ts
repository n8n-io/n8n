import { UserError } from 'n8n-workflow';
import { parsePath, toPostgresPath, toSQLitePath, needsQuoting } from '../utils/path-utils';

describe('path-utils', () => {
	describe('parsePath', () => {
		it.each([
			['a.b.c', ['a', 'b', 'c']],
			['a.b[0].c', ['a', 'b', 0, 'c']],
			['foo[2].bar[10].baz', ['foo', 2, 'bar', 10, 'baz']],
			['arr[0][1][2]', ['arr', 0, 1, 2]],
			['a', ['a']],
			['[0]', [0]],
			['a[0]', ['a', 0]],
			['a.b[0]', ['a', 'b', 0]],
		])('should parse simple path %s', (input, expected) => {
			expect(parsePath(input)).toEqual(expected);
		});

		it.each([
			['"key\\"with\\"quotes"', ['key"with"quotes']],
			["'single\\'quotes'", ["single'quotes"]],
			["noOuter\\'quotes", ["noOuter\\'quotes"]],
			['"escaped\\\\backslash"', ['escaped\\backslash']],
		])('should handle escaped characters in path %s', (input, expected) => {
			expect(parsePath(input)).toEqual(expected);
		});

		it.each([
			['a.b[0].c', ['a', 'b', 0, 'c']],
			['a.b[0]c', ['a', 'b', 0, 'c']],
		])('should handle optional dots after brackets in path %s', (input, expected) => {
			expect(parsePath(input)).toEqual(expected);
		});

		it('should handle empty path', () => {
			expect(parsePath('')).toEqual([]);
		});

		it.each([['a.b['], ['a.b[0'], ['a.b[0][1'], ['a.b[notANumber]'], ['a.b[1/0]']])(
			'should throw UserError for invalid paths: %s',
			(input) => {
				expect(() => parsePath(input)).toThrow(UserError);
			},
		);

		it.each([['"key.with.unmatched'], ["'key.with.unmatched"]])(
			'should throw UserError for unmatched quotes: %s',
			(input) => {
				expect(() => parsePath(input)).toThrow(UserError);
			},
		);
	});

	describe('needsQuoting', () => {
		it.each([
			['key.with.dots', true],
			['key[with]brackets', true],
			['key with spaces', false],
			['', true],
			['simple', false],
			['camelCase', false],
			['snake_case', false],
			['with123numbers', false],
		])('should return %s for key "%s"', (key, expected) => {
			expect(needsQuoting(key)).toBe(expected);
		});
	});

	describe('toPostgresPath', () => {
		describe('simple paths', () => {
			it.each([
				[['a', 'b', 'c'], "->'a'->'b'->>'c'"],
				[['a', 'b', 0, 'c'], "->'a'->'b'->0->>'c'"],
				[['foo', 2, 'bar'], "->'foo'->2->>'bar'"],
				[['a'], "->>'a'"],
				[[0], '->>0'],
				[['a', 0], "->'a'->>0"],
			])('should convert %j to %s', (input, expected) => {
				expect(toPostgresPath(input)).toBe(expected);
			});
		});

		describe('complex keys', () => {
			it.each([
				[['key.with.dots', 'normal'], "->'key.with.dots'->>'normal'"],
				[['key[with]brackets', 0, 'c'], "->'key[with]brackets'->0->>'c'"],
				[['key with spaces'], "->>'key with spaces'"],
				[['a.b', 'c[d]', 2, 'normal'], "->'a.b'->'c[d]'->2->>'normal'"],
			])('should handle complex keys %j', (input, expected) => {
				expect(toPostgresPath(input)).toBe(expected);
			});
		});

		describe('keys with quotes', () => {
			it.each([
				[["key's value"], "->>'key''s value'"],
				[['key\'s "mixed" quotes'], "->>'key''s \"mixed\" quotes'"],
				[["multiple''quotes"], "->>'multiple''''quotes'"],
			])('should escape quotes in %j', (input, expected) => {
				expect(toPostgresPath(input)).toBe(expected);
			});
		});

		it('should handle empty array', () => {
			expect(toPostgresPath([])).toBe('');
		});
	});

	describe('toSQLitePath', () => {
		describe('simple paths', () => {
			it.each([
				[['a', 'b', 'c'], '$.a.b.c'],
				[['a', 'b', 0, 'c'], '$.a.b[0].c'],
				[['foo', 2, 'bar', 10, 'baz'], '$.foo[2].bar[10].baz'],
				[['a'], '$.a'],
				[[0], '$[0]'],
				[['a', 0], '$.a[0]'],
			])('should convert %j to %s', (input, expected) => {
				expect(toSQLitePath(input)).toBe(expected);
			});
		});

		describe('complex keys', () => {
			it.each([
				[['key.with.dots', 'normal'], '$."key.with.dots".normal'],
				[['key[with]brackets', 0, 'c'], '$."key[with]brackets"[0].c'],
				[['key with spaces'], '$.key with spaces'],
				[['a.b', 'c[d]', 2, 'normal', 'with space'], '$."a.b"."c[d]"[2].normal.with space'],
			])('should handle complex keys %j', (input, expected) => {
				expect(toSQLitePath(input)).toBe(expected);
			});
		});

		describe('keys with quotes', () => {
			it.each([
				[['key"with"quotes'], '$.key\\"with\\"quotes'],
				[['key"double'], '$.key\\"double'],
				[['multiple""quotes'], '$.multiple\\"\\"quotes'],
				[['"quoteAtStart"'], '$.\\"quoteAtStart\\"'],
				[['with[index]'], '$."with[index]"'],
				[['with.dot'], '$."with.dot"'],
			])('should escape quotes in %j', (input, expected) => {
				expect(toSQLitePath(input)).toBe(expected);
			});
		});

		it('should handle empty array', () => {
			expect(toSQLitePath([])).toBe('$');
		});

		it('should handle mixed simple and complex keys', () => {
			const path = ['simple', 'key.complex', 0, 'another.one', 'normal'];
			expect(toSQLitePath(path)).toBe('$.simple."key.complex"[0]."another.one".normal');
		});
	});

	describe('end-to-end conversions', () => {
		it.each([
			['a', "->>'a'", '$.a'],
			['a.b[0].c', "->'a'->'b'->0->>'c'", '$.a.b[0].c'],
			[
				'"key.dots"."key[brackets]"."key\\"quote\\"".\'\\\'otherQuote\\\'\'[0].normal',
				"->'key.dots'->'key[brackets]'->'key\"quote\"'->'''otherQuote'''->0->>'normal'",
				'$."key.dots"."key[brackets]".key\\"quote\\".\'otherQuote\'[0].normal',
			],

			['a."b"[0]."c"', "->'a'->'b'->0->>'c'", '$.a.b[0].c'],
			['data[0].items[5].name', "->'data'->0->'items'->5->>'name'", '$.data[0].items[5].name'],
		])('should convert path string %s correctly', (pathString, expectedPg, expectedSqlite) => {
			const parsed = parsePath(pathString);
			expect(toPostgresPath(parsed)).toBe(expectedPg);
			expect(toSQLitePath(parsed)).toBe(expectedSqlite);
		});
	});

	describe('edge cases', () => {
		it('should handle single array index', () => {
			expect(parsePath('[0]')).toEqual([0]);
			expect(toPostgresPath([0])).toBe('->>0');
			expect(toSQLitePath([0])).toBe('$[0]');
		});

		it('should handle consecutive array indices', () => {
			expect(parsePath('[0][1][2]')).toEqual([0, 1, 2]);
			expect(toPostgresPath([0, 1, 2])).toBe('->0->1->>2');
			expect(toSQLitePath([0, 1, 2])).toBe('$[0][1][2]');
		});

		it('should handle empty string key', () => {
			expect(parsePath('""')).toEqual(['']);
			expect(toPostgresPath([''])).toBe("->>''");
			expect(toSQLitePath([''])).toBe('$.""');
		});

		it('should handle very long paths', () => {
			const longPath = Array(50).fill('key').join('.');
			const parsed = parsePath(longPath);
			expect(parsed).toHaveLength(50);
			expect(parsed.every((k) => k === 'key')).toBe(true);
		});
	});
});
