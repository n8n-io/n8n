/**
 * Equivalence cases of the Postgres node for a query that has no exact form with bind
 * values. The library node then makes the text that pg-promise makes in the v1 node, and
 * sends it as a simple statement. The tables are in `POSTGRES_SETUP` of `postgres-cases.ts`.
 */
import type { PostgresCase } from './postgres-cases.ts';

type Values = Record<string, unknown>;

function query(
	name: string,
	text: string,
	options: Values = {},
	extra: Partial<PostgresCase> = {},
): PostgresCase {
	return {
		name: `executeQuery as text, ${name}`,
		typeVersion: 2.6,
		parameters: { operation: 'executeQuery', query: text, options },
		...extra,
	};
}

const NOTE =
	'INSERT INTO pgcase.notes VALUES ($1, 1, $2); SELECT count(*)::int AS n FROM pgcase.notes';
const NOTES = [
	{ id: 7, body: "O'Hara \\ said; -- $1" },
	{ id: 8, body: null },
];
const noteValues = { queryReplacement: '={{ [$json.id, $json.body] }}' };
const TWO = [{ a: 1 }, { a: 2 }];
/** The second item has two commands. The second of them fails for the item 2. */
const SECOND_TEXT =
	"={{ $json.a === 1 ? 'SELECT 1 AS n' : 'UPDATE pgcase.people SET age = 99 WHERE id = 1; SELECT nope' }}";
const MODES: Array<[string, Values]> = [
	['single', {}],
	['transaction', { queryBatching: 'transaction' }],
	['independently', { queryBatching: 'independently' }],
];
const SETTINGS: Array<[string, Partial<PostgresCase>]> = [
	['stop', {}],
	['continue', { onError: 'continueRegularOutput' }],
	['error output', { onError: 'continueErrorOutput' }],
];

export const POSTGRES_SIMPLE_CASES: PostgresCase[] = [
	query('two commands', 'SELECT 1 AS a; SELECT 2 AS b'),
	query(
		'two commands without rows',
		'UPDATE pgcase.people SET age = 1 WHERE id = -1; DELETE FROM pgcase.notes WHERE id = -1',
	),
	query('two commands that only read, without rows', 'SELECT 1 WHERE false; SELECT 2 WHERE false'),
	query('a variable in a comment', 'SELECT $1::int AS a -- the value $1', {
		queryReplacement: '5',
	}),
	query('a variable in a dollar quote', 'SELECT $$a $1 b$$ AS t, $1 AS v', {
		queryReplacement: "it's",
	}),
	query('a variable in a string', "SELECT 'a $1 b' AS t", { queryReplacement: 'x' }),
	query('a variable after a type name', 'SELECT (date $1)::text AS d', {
		queryReplacement: '2024-02-29',
	}),
	query(
		'the filters of pg-promise',
		'SELECT $1:name, $2:raw AS two, $3:json AS doc, $4^ AS four FROM pgcase.people WHERE age IN ($5:csv) ORDER BY id',
		{ queryReplacement: '={{ ["name", "1 + 1", { a: "it\'s" }, "4", [34, 27]] }}' },
	),
	query('a list as a value', 'SELECT name FROM pgcase.people WHERE age = ANY($1) ORDER BY id', {
		queryReplacement: '={{ [[34, 27]] }}',
	}),
	query(
		'values of each kind',
		'SELECT $1 AS a, $2 AS b, $3 AS c, $4 AS d, $5::jsonb AS e; SELECT 1 AS f',
		{
			queryReplacement: '={{ ["a\'b", 1.5, true, null, { k: [1, "x"] }] }}',
		},
	),
	query('a variable without a value in two commands', 'SELECT $1 AS a; SELECT $2 AS b', {
		queryReplacement: 'a',
	}),
	query('a date in version 2.6', 'SELECT born FROM pgcase.people ORDER BY id; SELECT 1 AS a'),
	query(
		'arrays and an interval',
		"SELECT tags FROM pgcase.people ORDER BY id; SELECT interval '1 day 2 hours' AS i",
	),
	query(
		'commands with a transaction of their own',
		'BEGIN; UPDATE pgcase.people SET age = 1 WHERE id = 1; COMMIT; SELECT age FROM pgcase.people WHERE id = 1',
	),
	query(
		'rows that are only an error, from two commands and one item',
		"SELECT 'x' AS error; SELECT 'y' AS error",
		{},
		{ onError: 'continueErrorOutput', items: [{ a: 1 }] },
	),
	query(
		'two commands before version 2.3',
		'SELECT 1 AS a; SELECT 2 AS b',
		{ queryBatching: 'transaction' },
		{ typeVersion: 2.2, host: true },
	),
	query(
		'two commands in version 2.2, single',
		'SELECT 1 AS a; SELECT 2 AS b',
		{},
		{ typeVersion: 2.2 },
	),
	...SETTINGS.flatMap(([setting, extra]) =>
		MODES.flatMap(([mode, options]) => [
			query(
				`two commands with values for each item, ${mode}, ${setting}`,
				NOTE,
				{
					...noteValues,
					...options,
				},
				{ ...extra, items: NOTES },
			),
			query(
				`a failure in the second command of the second item, ${mode}, ${setting}`,
				SECOND_TEXT,
				options,
				{
					...extra,
					items: TWO,
				},
			),
			query(
				`a value that pg-promise refuses in the second item, ${mode}, ${setting}`,
				'SELECT $1 AS a; SELECT $2 AS b',
				{ ...options, queryReplacement: '={{ $json.a === 1 ? [1, 2] : [1] }}' },
				// When the node stops on an error, v1 runs the first query and then fails. The
				// library node sends nothing, and the host runs the node.
				{
					...extra,
					items: TWO,
					...(setting === 'stop' && mode !== 'single' ? { host: true } : {}),
				},
			),
		]),
	),
];
