import {
	escapeQualifiedSqlIdentifier,
	escapeSqlIdentifier,
	findUnsafeMetadataFilterKey,
	isSafeQualifiedSqlIdentifier,
	isSafeSqlIdentifier,
} from './sqlIdentifier';

describe('sqlIdentifier', () => {
	describe('escapeSqlIdentifier', () => {
		it('wraps a plain identifier in double quotes', () => {
			expect(escapeSqlIdentifier('n8n_vectors')).toBe('"n8n_vectors"');
		});

		it('doubles embedded double quotes', () => {
			expect(escapeSqlIdentifier('a"b')).toBe('"a""b"');
		});

		it('contains a statement-breaking value within a single quoted token', () => {
			const result = escapeSqlIdentifier('foo; DROP TABLE victim; --');

			expect(result).toBe('"foo; DROP TABLE victim; --"');
			expect(result.startsWith('"')).toBe(true);
			expect(result.endsWith('"')).toBe(true);
			// No unescaped quote remains inside, so the value cannot terminate the identifier early.
			expect(result.slice(1, -1)).not.toContain('"');
		});
	});

	describe('escapeQualifiedSqlIdentifier', () => {
		it('quotes a single identifier', () => {
			expect(escapeQualifiedSqlIdentifier('n8n_chat_histories')).toBe('"n8n_chat_histories"');
		});

		it('quotes each part of a schema-qualified identifier', () => {
			expect(escapeQualifiedSqlIdentifier('my_schema.my_table')).toBe('"my_schema"."my_table"');
		});

		it('folds mixed-case parts to lower case before quoting', () => {
			expect(escapeQualifiedSqlIdentifier('MyTable')).toBe('"mytable"');
			expect(escapeQualifiedSqlIdentifier('MySchema.MyTable')).toBe('"myschema"."mytable"');
		});

		it('quotes each segment of a value that contains a dot', () => {
			expect(escapeQualifiedSqlIdentifier('foo"; DROP TABLE victim; --.bar')).toBe(
				'"foo""; drop table victim; --"."bar"',
			);
		});
	});

	describe('isSafeSqlIdentifier', () => {
		it.each(['n8n_vectors', '_private', 'a1', 'Column$1', 'embedding'])('accepts %s', (value) => {
			expect(isSafeSqlIdentifier(value)).toBe(true);
		});

		it.each(['a-b', 'a b', '1abc', 'a"b', 'a;b', "a'b", 'a.b', ''])('rejects %s', (value) => {
			expect(isSafeSqlIdentifier(value)).toBe(false);
		});
	});

	describe('isSafeQualifiedSqlIdentifier', () => {
		it.each(['n8n_vectors', 'my_schema.my_table', 'public.n8n_chat_histories'])(
			'accepts %s',
			(value) => {
				expect(isSafeQualifiedSqlIdentifier(value)).toBe(true);
			},
		);

		it.each([
			'foo(id SERIAL PRIMARY KEY); DROP TABLE victim; --',
			'x"; DROP TABLE victim; --',
			'a.',
			'.a',
			'a..b',
			'',
		])('rejects %s', (value) => {
			expect(isSafeQualifiedSqlIdentifier(value)).toBe(false);
		});

		it('rejects non-string values without throwing', () => {
			expect(isSafeQualifiedSqlIdentifier(undefined)).toBe(false);
			expect(isSafeQualifiedSqlIdentifier(null)).toBe(false);
			expect(isSafeQualifiedSqlIdentifier(123)).toBe(false);
		});
	});

	describe('findUnsafeMetadataFilterKey', () => {
		it('returns undefined for safe keys (including spaces and dashes)', () => {
			expect(findUnsafeMetadataFilterKey(undefined)).toBeUndefined();
			expect(findUnsafeMetadataFilterKey({})).toBeUndefined();
			expect(findUnsafeMetadataFilterKey({ source: 'docs', 'my key-1': 'x' })).toBeUndefined();
		});

		it('returns the offending key when it contains a quote or backslash', () => {
			expect(findUnsafeMetadataFilterKey({ "x'); DROP": '1' })).toBe("x'); DROP");
			expect(findUnsafeMetadataFilterKey({ ok: '1', 'a\\b': '2' })).toBe('a\\b');
		});
	});
});
