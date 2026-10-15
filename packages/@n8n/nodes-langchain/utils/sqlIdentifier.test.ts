import {
	escapeQualifiedSqlIdentifier,
	escapeSqlIdentifier,
	findUnsafeMetadataFilterKey,
	findUnsupportedJsonPathFilterKey,
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
			'a.b.c',
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

	describe('findUnsupportedJsonPathFilterKey', () => {
		it.each([
			['a plain name', { userId: 'alice' }],
			['an underscored name', { user_id: 'alice' }],
			['a leading underscore', { _internal: true }],
			['mixed case', { UserID: 'alice' }],
			['trailing digits', { field2: 'x' }],
			['several names at once', { project: 'n8n', category: 'movies', author: 'a' }],
			['an array value', { author: ['a', 'b'] }],
			['an operator in value position', { rating: { $gte: 4.5 } }],
			['an operator the store does not know', { nested: { flag: true } }],
			['names nested under $and', { $and: [{ project: 'n8n' }, { language: 'en' }] }],
			['names nested under $or', { $or: [{ project: 'n8n' }] }],
			['no filter at all', undefined],
		])('accepts %s', (_name, filter) => {
			expect(findUnsupportedJsonPathFilterKey(filter)).toBeUndefined();
		});

		it.each([
			['a quote', "x'"],
			['a backslash', 'a\\b'],
			['a double quote', 'a"b'],
			['a path predicate', 'userId?(@ == "bob")'],
			['a dot', 'user.id'],
			['a hyphen', 'file-name'],
			['a space', 'my key'],
			['a dollar sign', 'a$b'],
			['a leading digit', '1field'],
			['an empty name', ''],
		])('rejects %s', (_name, key) => {
			expect(findUnsupportedJsonPathFilterKey({ [key]: 'value' })).toBe(key);
		});

		it('reports a name nested under $and', () => {
			const filter = { $and: [{ project: 'n8n' }, { "x'": 'alice' }] };

			expect(findUnsupportedJsonPathFilterKey(filter)).toBe("x'");
		});

		it('reports a name nested under $or inside $and', () => {
			const filter = { $and: [{ $or: [{ ok: 1 }, { 'a.b': 2 }] }] };

			expect(findUnsupportedJsonPathFilterKey(filter)).toBe('a.b');
		});

		it('reports the first unsupported name when several are present', () => {
			const filter = { good: 1, "bad'one": 2, 'bad.two': 3 };

			expect(findUnsupportedJsonPathFilterKey(filter)).toBe("bad'one");
		});
	});
});
