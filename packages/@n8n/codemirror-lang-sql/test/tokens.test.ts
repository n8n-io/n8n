import type { LRParser } from '@lezer/lr';

import { MySQL, PostgreSQL, SQLDialect } from '../src';

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
	return String(props[key].tree);
};

const parseMixed = (parser: LRParser, input: string) => {
	return String(parser.parse(input) as unknown);
};

describe('Parse MySQL tokens', () => {
	const parser = mysqlTokens.parser;

	it('parses quoted bit-value literals', () => {
		expect(parse(parser, "SELECT b'0101'")).toEqual('Script(Statement(Keyword,Whitespace,Bits))');
	});

	it('parses unquoted bit-value literals', () => {
		expect(parse(parser, 'SELECT 0b01')).toEqual('Script(Statement(Keyword,Whitespace,Bits))');
	});
});

describe('Parse PostgreSQL tokens', () => {
	const parser = postgresqlTokens.parser;

	it('parses quoted bit-value literals', () => {
		expect(parse(parser, "SELECT b'0101'")).toEqual('Script(Statement(Keyword,Whitespace,Bits))');
	});

	it('parses quoted bit-value literals', () => {
		expect(parse(parser, "SELECT B'0101'")).toEqual('Script(Statement(Keyword,Whitespace,Bits))');
	});

	it('parses double dollar quoted Whitespace literals', () => {
		expect(parse(parser, 'SELECT $$hello$$')).toEqual(
			'Script(Statement(Keyword,Whitespace,String))',
		);
	});
});

describe('Parse BigQuery tokens', () => {
	const parser = bigQueryTokens.parser;

	it('parses quoted bytes literals in single quotes', () => {
		expect(parse(parser, "SELECT b'abcd'")).toEqual('Script(Statement(Keyword,Whitespace,Bytes))');
	});

	it('parses quoted bytes literals in double quotes', () => {
		expect(parse(parser, 'SELECT b"abcd"')).toEqual('Script(Statement(Keyword,Whitespace,Bytes))');
	});

	it('parses bytes literals in single quotes', () => {
		expect(parse(parser, "SELECT b'0101'")).toEqual('Script(Statement(Keyword,Whitespace,Bytes))');
	});

	it('parses bytes literals in double quotes', () => {
		expect(parse(parser, 'SELECT b"0101"')).toEqual('Script(Statement(Keyword,Whitespace,Bytes))');
	});
});

describe('Parse n8n resolvables', () => {
	const parser = postgresqlTokens.parser;

	it('parses resolvables with dots inside composite identifiers', () => {
		expect(parseMixed(parser, "SELECT my_column FROM {{ 'schema' }}.{{ 'table' }}")).toEqual(
			'Program(Plaintext,Resolvable,Plaintext,Resolvable)',
		);
		expect(
			parseMixed(parser, "SELECT my_column FROM {{ 'schema' }}.{{ 'table' }}.{{ 'foo' }}"),
		).toEqual('Program(Plaintext,Resolvable,Plaintext,Resolvable,Plaintext,Resolvable)');
		expect(parseMixed(parser, "SELECT my_column FROM public.{{ 'table' }}")).toEqual(
			'Program(Plaintext,Resolvable)',
		);
		expect(parseMixed(parser, "SELECT my_column FROM {{ 'schema' }}.users")).toEqual(
			'Program(Plaintext,Resolvable,Plaintext)',
		);
	});

	it('parses 4-node SELECT variants', () => {
		expect(parseMixed(parser, "{{ 'SELECT' }} my_column FROM my_table")).toEqual(
			'Program(Resolvable,Plaintext)',
		);

		expect(parseMixed(parser, "SELECT {{ 'my_column' }} FROM my_table")).toEqual(
			'Program(Plaintext,Resolvable,Plaintext)',
		);

		expect(parseMixed(parser, "SELECT my_column {{ 'FROM' }} my_table")).toEqual(
			'Program(Plaintext,Resolvable,Plaintext)',
		);

		expect(parseMixed(parser, "SELECT my_column FROM {{ 'my_table' }}")).toEqual(
			'Program(Plaintext,Resolvable)',
		);
	});

	it('parses 5-node SELECT variants (with semicolon)', () => {
		expect(parseMixed(parser, "{{ 'SELECT' }} my_column FROM my_table;")).toEqual(
			'Program(Resolvable,Plaintext)',
		);

		expect(parseMixed(parser, "SELECT {{ 'my_column' }} FROM my_table;")).toEqual(
			'Program(Plaintext,Resolvable,Plaintext)',
		);

		expect(parseMixed(parser, "SELECT my_column {{ 'FROM' }} my_table;")).toEqual(
			'Program(Plaintext,Resolvable,Plaintext)',
		);

		expect(parseMixed(parser, "SELECT my_column FROM {{ 'my_table' }};")).toEqual(
			'Program(Plaintext,Resolvable,Plaintext)',
		);
	});

	it('parses single-quoted resolvable with no whitespace', () => {
		expect(parseMixed(parser, "SELECT my_column FROM '{{ 'my_table' }}';")).toEqual(
			'Program(Plaintext,Resolvable,Plaintext)',
		);
	});

	it('parses single-quoted resolvable with leading whitespace', () => {
		expect(parseMixed(parser, "SELECT my_column FROM ' {{ 'my_table' }}';")).toEqual(
			'Program(Plaintext,Resolvable,Plaintext)',
		);
	});

	it('parses single-quoted resolvable with trailing whitespace', () => {
		expect(parseMixed(parser, "SELECT my_column FROM '{{ 'my_table' }} ';")).toEqual(
			'Program(Plaintext,Resolvable,Plaintext)',
		);
	});

	it('parses single-quoted resolvable with surrounding whitespace', () => {
		expect(parseMixed(parser, "SELECT my_column FROM ' {{ 'my_table' }} ';")).toEqual(
			'Program(Plaintext,Resolvable,Plaintext)',
		);
	});
});
