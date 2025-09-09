import type { LRParser } from '@lezer/lr';
import ist from 'ist';

import { PostgreSQL, MySQL, SQLDialect } from '../src/sql';

const mysqlTokens = MySQL.language;
const postgresqlTokens = PostgreSQL.language;
const bigQueryTokens = SQLDialect.define({
	treatBitsAsBytes: true,
}).language;

const parse = (parser: LRParser, input: string) => {
	const tree = parser.parse(input);
	const props: Record<string, { tree: unknown }> = (
		tree as unknown as { props: Record<string, { tree: unknown }> }
	).props;
	const key = Object.keys(props)[0];
	return props[key].tree;
};

const parseMixed = (parser: LRParser, input: string) => {
	return parser.parse(input);
};

describe('Parse MySQL tokens', () => {
	const parser = mysqlTokens.parser;

	it('parses quoted bit-value literals', () => {
		ist(parse(parser, "SELECT b'0101'"), 'Script(Statement(Keyword,Whitespace,Bits))');
	});

	it('parses unquoted bit-value literals', () => {
		ist(parse(parser, 'SELECT 0b01'), 'Script(Statement(Keyword,Whitespace,Bits))');
	});
});

describe('Parse PostgreSQL tokens', () => {
	const parser = postgresqlTokens.parser;

	it('parses quoted bit-value literals', () => {
		ist(parse(parser, "SELECT b'0101'"), 'Script(Statement(Keyword,Whitespace,Bits))');
	});

	it('parses quoted bit-value literals', () => {
		ist(parse(parser, "SELECT B'0101'"), 'Script(Statement(Keyword,Whitespace,Bits))');
	});

	it('parses double dollar quoted Whitespace literals', () => {
		ist(parse(parser, 'SELECT $$hello$$'), 'Script(Statement(Keyword,Whitespace,String))');
	});
});

describe('Parse BigQuery tokens', () => {
	const parser = bigQueryTokens.parser;

	it('parses quoted bytes literals in single quotes', () => {
		ist(parse(parser, "SELECT b'abcd'"), 'Script(Statement(Keyword,Whitespace,Bytes))');
	});

	it('parses quoted bytes literals in double quotes', () => {
		ist(parse(parser, 'SELECT b"abcd"'), 'Script(Statement(Keyword,Whitespace,Bytes))');
	});

	it('parses bytes literals in single quotes', () => {
		ist(parse(parser, "SELECT b'0101'"), 'Script(Statement(Keyword,Whitespace,Bytes))');
	});

	it('parses bytes literals in double quotes', () => {
		ist(parse(parser, 'SELECT b"0101"'), 'Script(Statement(Keyword,Whitespace,Bytes))');
	});
});

describe('Parse n8n resolvables', () => {
	const parser = postgresqlTokens.parser;

	it('parses resolvables with dots inside composite identifiers', () => {
		ist(
			parseMixed(parser, "SELECT my_column FROM {{ 'schema' }}.{{ 'table' }}"),
			'Program(Plaintext,Resolvable,Plaintext,Resolvable)',
		);
		ist(
			parseMixed(parser, "SELECT my_column FROM {{ 'schema' }}.{{ 'table' }}.{{ 'foo' }}"),
			'Program(Plaintext,Resolvable,Plaintext,Resolvable,Plaintext,Resolvable)',
		);
		ist(
			parseMixed(parser, "SELECT my_column FROM public.{{ 'table' }}"),
			'Program(Plaintext,Resolvable)',
		);
		ist(
			parseMixed(parser, "SELECT my_column FROM {{ 'schema' }}.users"),
			'Program(Plaintext,Resolvable,Plaintext)',
		);
	});

	it('parses 4-node SELECT variants', () => {
		ist(
			parseMixed(parser, "{{ 'SELECT' }} my_column FROM my_table"),
			'Program(Resolvable,Plaintext)',
		);

		ist(
			parseMixed(parser, "SELECT {{ 'my_column' }} FROM my_table"),
			'Program(Plaintext,Resolvable,Plaintext)',
		);

		ist(
			parseMixed(parser, "SELECT my_column {{ 'FROM' }} my_table"),
			'Program(Plaintext,Resolvable,Plaintext)',
		);

		ist(
			parseMixed(parser, "SELECT my_column FROM {{ 'my_table' }}"),
			'Program(Plaintext,Resolvable)',
		);
	});

	it('parses 5-node SELECT variants (with semicolon)', () => {
		ist(
			parseMixed(parser, "{{ 'SELECT' }} my_column FROM my_table;"),
			'Program(Resolvable,Plaintext)',
		);

		ist(
			parseMixed(parser, "SELECT {{ 'my_column' }} FROM my_table;"),
			'Program(Plaintext,Resolvable,Plaintext)',
		);

		ist(
			parseMixed(parser, "SELECT my_column {{ 'FROM' }} my_table;"),
			'Program(Plaintext,Resolvable,Plaintext)',
		);

		ist(
			parseMixed(parser, "SELECT my_column FROM {{ 'my_table' }};"),
			'Program(Plaintext,Resolvable,Plaintext)',
		);
	});

	it('parses single-quoted resolvable with no whitespace', () => {
		ist(
			parseMixed(parser, "SELECT my_column FROM '{{ 'my_table' }}';"),
			'Program(Plaintext,Resolvable,Plaintext)',
		);
	});

	it('parses single-quoted resolvable with leading whitespace', () => {
		ist(
			parseMixed(parser, "SELECT my_column FROM ' {{ 'my_table' }}';"),
			'Program(Plaintext,Resolvable,Plaintext)',
		);
	});

	it('parses single-quoted resolvable with trailing whitespace', () => {
		ist(
			parseMixed(parser, "SELECT my_column FROM '{{ 'my_table' }} ';"),
			'Program(Plaintext,Resolvable,Plaintext)',
		);
	});

	it('parses single-quoted resolvable with surrounding whitespace', () => {
		ist(
			parseMixed(parser, "SELECT my_column FROM ' {{ 'my_table' }} ';"),
			'Program(Plaintext,Resolvable,Plaintext)',
		);
	});
});
