/**
 * Equivalence cases of the Postgres node. Each case runs the v1 node and the
 * library node on a real database with the same tables, and the test compares
 * the output or the error, and the tables afterwards.
 */
import {
	POSTGRES_QUERY_TEXT_CASES,
	POSTGRES_VERSION_CASES,
	POSTGRES_WRITE_CASES,
} from './postgres-write-cases.ts';

export interface PostgresCase {
	/** Unique name. The recording file uses it as the key. */
	name: string;
	typeVersion: number;
	/** The parameters of the v1 node, with n8n expressions. */
	parameters: Record<string, unknown>;
	/** Input items. The default is one empty item. */
	items?: Array<Record<string, unknown>>;
	/**
	 * The call has no exact form with bind values: the library node, or the `sql` effect,
	 * ends with a limit marker before a statement is committed, and the host runs the node.
	 */
	host?: boolean;
	/** The converter keeps the node in the host. */
	convertHost?: boolean;
	/** The error setting of the node. */
	onError?: string;
}

const located = {
	schema: { __rl: true, mode: 'list', value: 'pgcase' },
	table: { __rl: true, mode: 'list', value: 'people' },
};

function query(
	name: string,
	text: string,
	options: Record<string, unknown> = {},
	extra: Partial<PostgresCase> = {},
): PostgresCase {
	return {
		name: `executeQuery, ${name}`,
		typeVersion: 2.6,
		parameters: { operation: 'executeQuery', query: text, options },
		...extra,
	};
}

function select(
	name: string,
	parameters: Record<string, unknown>,
	extra: Partial<PostgresCase> = {},
): PostgresCase {
	return {
		name: `select, ${name}`,
		typeVersion: 2.6,
		parameters: { operation: 'select', ...located, options: {}, ...parameters },
		...extra,
	};
}

function remove(
	name: string,
	parameters: Record<string, unknown>,
	extra: Partial<PostgresCase> = {},
): PostgresCase {
	return {
		name: `deleteTable, ${name}`,
		typeVersion: 2.6,
		parameters: { operation: 'deleteTable', ...located, options: {}, ...parameters },
		...extra,
	};
}

const where = (...values: Array<Record<string, unknown>>) => ({ where: { values } });
const two = [
	{ name: 'Dora', age: 51 },
	{ name: 'Emil', age: 19 },
];

/** The tables of each case. The test makes them again before each run. */
export const POSTGRES_SETUP = [
	'DROP SCHEMA IF EXISTS pgcase CASCADE',
	'CREATE SCHEMA pgcase',
	`CREATE TABLE pgcase.people (
		id serial PRIMARY KEY, name text UNIQUE, age int, score numeric(10,2), big int8,
		active bool, meta jsonb, born date, seen timestamptz, made timestamp, ratio float8,
		tags int[], bin bytea)`,
	`INSERT INTO pgcase.people (name, age, score, big, active, meta, born, seen, made, ratio, tags, bin) VALUES
		('Ann', 34, 12.50, 9007199254740993, true, '{"a": [1, 2]}', '1990-02-03', '2024-01-02 03:04:05.678+00', '2024-01-02 03:04:05', 0.1, '{1,2}', '\\x0102ff'),
		('Bob', 27, NULL, 5, false, NULL, NULL, NULL, NULL, 'NaN', NULL, NULL),
		('Cy "The" O''Neil', 61, 0.00, -1, NULL, '"text"', '2001-12-31', '1999-12-31 23:59:59+02', '1999-12-31 23:59:59.5', 1e300, '{}', '\\x')`,
	'CREATE TABLE pgcase.notes (id int PRIMARY KEY, person int REFERENCES pgcase.people(id), body text)',
	"INSERT INTO pgcase.notes VALUES (1, 1, 'first')",
	"CREATE TYPE pgcase.mood AS ENUM ('sad', 'ok', 'happy')",
	`CREATE TABLE pgcase.things (
		id int PRIMARY KEY, label text NOT NULL, qty int, price numeric(10,2), ok bool, doc jsonb,
		raw json, tags text[], nums int[], day date, at timestamptz, plain timestamp, lunch time,
		feel pgcase.mood, note text DEFAULT 'none', UNIQUE (label, qty))`,
	"INSERT INTO pgcase.things (id, label, qty) VALUES (1, 'one', 1), (2, 'two', 2)",
	`CREATE TABLE pgcase.plain (
		id serial PRIMARY KEY, label text NOT NULL, qty int, price numeric(10,2), ok bool,
		doc jsonb, at timestamptz, "Odd ""Name" text DEFAULT 'none')`,
	"INSERT INTO pgcase.plain (label, qty) VALUES ('first', 1)",
	'CREATE TABLE pgcase.strict (id int, tags text[] NOT NULL)',
];

/** The state of the tables, as text. A table that is gone gives the error text. */
export const POSTGRES_STATE = [
	"SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY id)::text, '[]') AS state FROM pgcase.people p",
	"SELECT coalesce(jsonb_agg(to_jsonb(n) ORDER BY id)::text, '[]') AS state FROM pgcase.notes n",
	'SELECT last_value::text || is_called::text AS state FROM pgcase.people_id_seq',
	"SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY id)::text, '[]') AS state FROM pgcase.things t",
	"SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY id)::text, '[]') AS state FROM pgcase.plain p",
	'SELECT last_value::text || is_called::text AS state FROM pgcase.plain_id_seq',
	"SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY id)::text, '[]') AS state FROM pgcase.strict s",
];

export const POSTGRES_CASES: PostgresCase[] = [
	query(
		'columns of the common types',
		'SELECT id, name, age, score, big, active, meta, ratio FROM pgcase.people ORDER BY id',
	),
	query('large numbers as numbers', 'SELECT id, score, big, ratio FROM pgcase.people ORDER BY id', {
		largeNumbersOutput: 'numbers',
	}),
	query('a time with a zone', 'SELECT id, seen FROM pgcase.people ORDER BY id'),
	query('a time without a zone', 'SELECT id, made FROM pgcase.people ORDER BY id'),
	query('binary data', 'SELECT id, bin FROM pgcase.people ORDER BY id'),
	query(
		'a date in version 2.7',
		'SELECT id, born FROM pgcase.people ORDER BY id',
		{},
		{ typeVersion: 2.7 },
	),
	query(
		'a date in version 2.6',
		'SELECT id, born FROM pgcase.people ORDER BY id',
		{},
		{ host: true },
	),
	query('an array column', 'SELECT id, tags FROM pgcase.people ORDER BY id', {}, { host: true }),
	query('an interval column', 'SELECT now() - now() AS gap', {}, { host: true }),
	query(
		'other types as text',
		"SELECT 'a'::varchar AS v, '00000000-0000-0000-0000-000000000001'::uuid AS u, '10:11:12'::time AS t, 'x'::char(3) AS c, 5::int2 AS s, 1.5::float4 AS f",
	),
	query('two columns with one name', 'SELECT 1 AS a, 2::int8 AS a'),
	query('no rows of a select', 'SELECT id FROM pgcase.people WHERE age > 100'),
	query('a text that ends with a semicolon', 'SELECT count(*) AS n FROM pgcase.people;\n'),
	query(
		'a comment in the text',
		'-- the people\nSELECT name /* all */ FROM pgcase.people ORDER BY id',
	),
	query(
		'query parameters from expressions',
		'SELECT name FROM pgcase.people WHERE name = $1 OR age > $2 ORDER BY id',
		{ queryReplacement: '={{ $json.name }}, {{ $json.age }}' },
		{ items: [{ name: 'Bob', age: 50 }] },
	),
	query(
		'query parameters as plain text',
		'SELECT name FROM pgcase.people WHERE name IN ($1, $2) ORDER BY id',
		{ queryReplacement: 'Ann, Bob' },
	),
	query(
		'a query parameter with a quote and a comma in JSON',
		'SELECT $1 AS a, $2::jsonb AS b',
		{ queryReplacement: '={{ $json.text }}, {{ $json.data }}' },
		{ items: [{ text: "it's", data: { k: 'a,b' } }] },
	),
	query(
		'a query parameter that is split at commas',
		'SELECT $1 AS a, $2 AS b',
		{ queryReplacement: '={{ $json.pair }}' },
		{ items: [{ pair: 'x, y' }] },
	),
	query(
		'query parameters from a list',
		'SELECT name FROM pgcase.people WHERE age IN ($1, $2) ORDER BY id',
		{ queryReplacement: '={{ $json.ages }}' },
		{ items: [{ ages: [34, 27] }] },
	),
	query(
		'a number as the query parameter',
		'SELECT name FROM pgcase.people WHERE age = $1',
		{ queryReplacement: '={{ $json.age }}' },
		{ items: [{ age: 27 }] },
	),
	query(
		'an expression in the query text',
		'=SELECT name FROM pgcase.people WHERE age > {{ $json.age }} ORDER BY id',
		{},
		{ items: [{ age: 30 }] },
	),
	query(
		'an insert for each item in one text',
		'INSERT INTO pgcase.people (name, age) VALUES ($1, $2) RETURNING id, name',
		{ queryReplacement: '={{ $json.name }}, {{ $json.age }}' },
		{ items: two },
	),
	query(
		'an insert without rows',
		'INSERT INTO pgcase.people (name, age) VALUES ($1, $2)',
		{ queryReplacement: '={{ $json.name }}, {{ $json.age }}' },
		{ items: two },
	),
	query(
		'an update that matches no row',
		'UPDATE pgcase.people SET age = $2 WHERE name = $1',
		{ queryReplacement: '={{ $json.name }}, {{ $json.age }}' },
		{ items: [{ name: 'Nobody', age: 1 }] },
	),
	query(
		'an update with rows',
		'UPDATE pgcase.people SET age = age + $2 WHERE name = $1 RETURNING id, age',
		{ queryReplacement: '={{ $json.name }}, {{ $json.age }}' },
		{ items: [{ name: 'Ann', age: 1 }] },
	),
	query(
		'a transaction for the items',
		'INSERT INTO pgcase.people (name, age) VALUES ($1, $2) RETURNING id',
		{ queryReplacement: '={{ $json.name }}, {{ $json.age }}', queryBatching: 'transaction' },
		{ items: two },
	),
	query(
		'each item on its own',
		'INSERT INTO pgcase.people (name, age) VALUES ($1, $2) RETURNING id',
		{ queryReplacement: '={{ $json.name }}, {{ $json.age }}', queryBatching: 'independently' },
		{ items: two },
	),
	query(
		'each item on its own, without rows',
		'DELETE FROM pgcase.notes WHERE id = $1',
		{ queryReplacement: '={{ $json.id }}', queryBatching: 'independently' },
		{ items: [{ id: 1 }, { id: 2 }] },
	),
	query(
		'a failure in one text undoes all items',
		'INSERT INTO pgcase.people (name, age) VALUES ($1, $2)',
		{ queryReplacement: '={{ $json.name }}, {{ $json.age }}' },
		{
			items: [
				{ name: 'Dora', age: 51 },
				{ name: 'Ann', age: 1 },
			],
		},
	),
	query(
		'a failure in a transaction undoes all items',
		'INSERT INTO pgcase.people (name, age) VALUES ($1, $2)',
		{ queryReplacement: '={{ $json.name }}, {{ $json.age }}', queryBatching: 'transaction' },
		{
			items: [
				{ name: 'Dora', age: 51 },
				{ name: 'Ann', age: 1 },
			],
		},
	),
	query(
		'a failure of the second item on its own keeps the first',
		'INSERT INTO pgcase.people (name, age) VALUES ($1, $2)',
		{ queryReplacement: '={{ $json.name }}, {{ $json.age }}', queryBatching: 'independently' },
		{
			items: [
				{ name: 'Dora', age: 51 },
				{ name: 'Ann', age: 1 },
				{ name: 'Emil', age: 2 },
			],
		},
	),
	query('a table that is not there', 'SELECT * FROM pgcase.nothing'),
	query('a syntax error', 'SELECT name\nFROM pgcase.people\nWERE age > 1'),
	query('a foreign key failure', 'DELETE FROM pgcase.people WHERE id = 1'),
	query('a variable in quotes without query parameters', "SELECT '$1' AS a, '$2' AS b"),
	query(
		'variables in quotes as text',
		"SELECT name FROM pgcase.people WHERE name = '$1' OR name = $1",
		{ queryReplacement: 'Ann', treatQueryParametersInSingleQuotesAsText: true },
	),
	query(
		'a query parameter that is null in version 2.8',
		'SELECT $1::int IS NULL AS a',
		{ queryReplacement: '={{ $json.none }}' },
		{ typeVersion: 2.8, items: [{ none: null }] },
	),
	query(
		'a query parameter that is null in version 2.6',
		'SELECT $1::int IS NULL AS a',
		{ queryReplacement: '={{ $json.none }}' },
		{ items: [{ none: null }] },
	),
	query(
		'one of two query parameters is null in version 2.6',
		'SELECT $1 IS NULL AS a, $2 AS b',
		{ queryReplacement: '={{ $json.none }}, {{ $json.b }}' },
		{ items: [{ none: null, b: 'x' }], host: true },
	),
	query(
		'one of two query parameters is null in version 2.8',
		'SELECT $1::int IS NULL AS a, $2 AS b',
		{ queryReplacement: '={{ $json.none }}, {{ $json.b }}' },
		{ typeVersion: 2.8, items: [{ none: null, b: 'x' }] },
	),
	query('ddl in one text', 'CREATE TABLE pgcase.made (id int)'),
	query('more than one command', 'SELECT 1 AS a; SELECT 2 AS b', {}, { host: true }),
	query(
		'a name filter of pg-promise',
		'SELECT $1:name FROM pgcase.people ORDER BY id',
		{ queryReplacement: 'name' },
		{ host: true },
	),
	query(
		'a variable in a comment',
		'SELECT name FROM pgcase.people WHERE age > $1 -- more than $1\nORDER BY id',
		{ queryReplacement: '30' },
		{ host: true },
	),
	query(
		'a variable in a quoted text with query parameters',
		"SELECT 'costs $1' AS a",
		{ queryReplacement: '5' },
		{ host: true },
	),
	query(
		'a typed literal',
		'SELECT (date $1)::text AS d',
		{ queryReplacement: '2024-01-02' },
		{ host: true },
	),
	query(
		'a function that takes any type',
		"SELECT concat($1, 'x') AS c",
		{ queryReplacement: 'a' },
		{ host: true },
	),
	query(
		'a variable without a value',
		'SELECT $1 AS a, $2 AS b',
		{ queryReplacement: 'a' },
		{ host: true },
	),
	query(
		'a list in a list of query parameters',
		'SELECT name FROM pgcase.people WHERE age = ANY($1)',
		{ queryReplacement: '={{ $json.ages }}' },
		{ items: [{ ages: [[34, 27]] }], host: true },
	),
	query(
		'a node that continues on fail',
		'SELECT 1 AS a',
		{},
		{ convertHost: true, onError: 'continueRegularOutput' },
	),
	query('a version below 2.1', 'SELECT 1 AS a', {}, { typeVersion: 2, convertHost: true }),

	select('all rows of two columns', {
		returnAll: true,
		options: { outputColumns: ['id', 'name'] },
	}),
	select('the default limit', { options: { outputColumns: ['id'] } }),
	select('a limit', { limit: 2, options: { outputColumns: ['id', 'age'] } }),
	select(
		'all columns with a date in version 2.7',
		{ returnAll: true },
		{ typeVersion: 2.7, host: true },
	),
	select('all columns with a date in version 2.6', { returnAll: true }, { host: true }),
	select('a condition with a text value', {
		returnAll: true,
		options: { outputColumns: ['id', 'name'] },
		...where({ column: 'name', condition: 'equal', value: 'Cy "The" O\'Neil' }),
	}),
	select(
		'a condition from an expression',
		{
			returnAll: true,
			options: { outputColumns: ['id'] },
			...where({ column: 'age', condition: '>', value: '={{ $json.age }}' }),
		},
		{ items: [{ age: '30' }, { age: 60 }] },
	),
	select('conditions with OR, LIKE and IS NULL', {
		returnAll: true,
		combineConditions: 'OR',
		options: { outputColumns: ['id'] },
		...where(
			{ column: 'name', condition: 'LIKE', value: 'A%' },
			{ column: 'score', condition: 'IS NULL' },
			{ column: 'age', condition: '>=', value: 61 },
		),
	}),
	select('conditions with AND and a not equal', {
		returnAll: true,
		options: { outputColumns: ['id'] },
		...where(
			{ column: 'name', condition: '!=', value: 'Ann' },
			{ column: 'active', condition: 'IS NOT NULL' },
			{ column: 'age', condition: '<', value: '30' },
			{ column: 'age', condition: '<=', value: 'x' },
		),
	}),
	select('a sort', {
		returnAll: true,
		options: { outputColumns: ['name'] },
		sort: { values: [{ column: 'active', direction: 'DESC' }, { column: 'age' }] },
	}),
	select('no rows', {
		returnAll: true,
		options: { outputColumns: ['id'] },
		...where({ column: 'age', condition: 'equal', value: 1 }),
	}),
	select('a column that is not there', {
		returnAll: true,
		...where({ column: 'nope', condition: 'equal', value: 1 }),
	}),
	select('a table by name with a quote', {
		schema: 'pgcase',
		table: 'pe"ople',
		returnAll: true,
	}),
	select('a condition that is not valid', {
		returnAll: true,
		...where({ column: 'age', condition: 'BETWEEN', value: 1 }),
	}),
	select('a limit that is not a number', { limit: 'many', options: { outputColumns: ['id'] } }),
	select(
		'each item on its own',
		{
			returnAll: true,
			options: { outputColumns: ['id'], queryBatching: 'independently' },
			...where({ column: 'age', condition: '>', value: '={{ $json.age }}' }),
		},
		{ items: [{ age: 30 }, { age: 100 }] },
	),
	select('large numbers as numbers', {
		returnAll: true,
		options: { outputColumns: ['id', 'big', 'score'], largeNumbersOutput: 'numbers' },
	}),

	remove('delete with a condition', {
		table: 'notes',
		deleteCommand: 'delete',
		...where({ column: 'id', condition: 'equal', value: 1 }),
	}),
	remove('delete all rows', { table: 'notes', deleteCommand: 'delete' }),
	remove(
		'delete for each item',
		{
			table: 'notes',
			deleteCommand: 'delete',
			...where({ column: 'body', condition: 'equal', value: '={{ $json.body }}' }),
		},
		{ items: [{ body: 'first' }, { body: 'none' }] },
	),
	remove('delete that a foreign key stops', {
		deleteCommand: 'delete',
		...where({ column: 'id', condition: 'equal', value: 1 }),
	}),
	remove('truncate', { table: 'notes', deleteCommand: 'truncate' }),
	remove('truncate with cascade and new sequences', {
		deleteCommand: 'truncate',
		restartSequences: true,
		options: { cascade: true },
	}),
	remove('truncate that a foreign key stops', { deleteCommand: 'truncate' }),
	remove('drop', { table: 'notes', deleteCommand: 'drop' }),
	remove('drop with cascade', { deleteCommand: 'drop', options: { cascade: true } }),
	remove('drop of a table that is not there', { table: 'nothing', deleteCommand: 'drop' }),
	remove(
		'a transaction for the items',
		{
			table: 'notes',
			deleteCommand: 'delete',
			options: { queryBatching: 'transaction' },
			...where({ column: 'id', condition: 'equal', value: '={{ $json.id }}' }),
		},
		{ items: [{ id: 1 }, { id: 2 }] },
	),
	...POSTGRES_QUERY_TEXT_CASES,
	...POSTGRES_WRITE_CASES,
	...POSTGRES_VERSION_CASES,
];
