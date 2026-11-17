/**
 * Equivalence cases of the Postgres node with a continue setting ("continue" and
 * "continue (using error output)"). The v1 node runs in n8n's engine, which makes the
 * error items and the error output. The tables are in `POSTGRES_SETUP` of
 * `postgres-cases.ts`.
 */
import type { PostgresCase } from './postgres-cases.ts';

type Values = Record<string, unknown>;

type OnError = NonNullable<PostgresCase['onError']>;
const REGULAR: OnError = 'continueRegularOutput';
const ERRORS: OnError = 'continueErrorOutput';
const THREE = [{ a: 1 }, { a: 2 }, { a: 3 }];
/** The query of the second item names a column that is not there. */
const SECOND_FAILS = "=SELECT {{ $json.a === 2 ? 'nope' : 'id' }} FROM pgcase.people LIMIT 1";
const MODES: Array<[string, Values]> = [
	['single', {}],
	['transaction', { queryBatching: 'transaction' }],
	['independently', { queryBatching: 'independently' }],
];

const listed = (table: string) => ({
	schema: { __rl: true, mode: 'list', value: 'pgcase' },
	table: { __rl: true, mode: 'list', value: table },
});

function setting(onError: OnError): string {
	return onError === REGULAR ? 'continue' : 'error output';
}

function query(
	name: string,
	onError: OnError,
	text: string,
	options: Values = {},
	extra: Partial<PostgresCase> = {},
): PostgresCase {
	return {
		name: `${setting(onError)}, executeQuery, ${name}`,
		typeVersion: 2.6,
		parameters: { operation: 'executeQuery', query: text, options },
		items: THREE,
		onError,
		...extra,
	};
}

function operation(
	name: string,
	onError: OnError,
	parameters: Values,
	extra: Partial<PostgresCase> = {},
): PostgresCase {
	return {
		name: `${setting(onError)}, ${String(parameters.operation)}, ${name}`,
		typeVersion: 2.6,
		parameters: { options: {}, ...parameters },
		items: THREE,
		onError,
		...extra,
	};
}

const auto = { mappingMode: 'autoMapInputData', value: null, matchingColumns: [], schema: [] };
const NEW_PEOPLE = [{ name: 'Dora' }, { name: 'Ann' }, { name: 'Emil' }];

function both(make: (onError: OnError) => PostgresCase[]): PostgresCase[] {
	return [...make(REGULAR), ...make(ERRORS)];
}

export const POSTGRES_CONTINUE_CASES: PostgresCase[] = [
	...both((onError) => [
		...MODES.flatMap(([mode, options]) => [
			query(`rows, ${mode}`, onError, '=SELECT {{ $json.a }} AS n', options),
			query(`a failure of the second query, ${mode}`, onError, SECOND_FAILS, options),
			query(`a syntax error in each query, ${mode}`, onError, '=SELEC {{ $json.a }}', options),
			query(
				`a statement without rows, ${mode}`,
				onError,
				'=UPDATE pgcase.people SET age = 1 WHERE id = -{{ $json.a }}',
				options,
			),
			operation(`a table that is not there, ${mode}`, onError, {
				operation: 'select',
				...listed('nothing'),
				where: { values: [{ column: 'age', condition: '>', value: '={{ $json.a }}' }] },
				sort: { values: [{ column: 'name', direction: 'DESC' }] },
				limit: 2,
				options,
			}),
			operation(`a name that is not valid in the second query, ${mode}`, onError, {
				operation: 'select',
				...listed('people'),
				where: {
					values: [
						{
							column: "={{ $json.a === 2 ? '' : 'age' }}",
							condition: 'equal',
							value: 27,
						},
					],
				},
				options: { ...options, outputColumns: ['name'] },
			}),
			operation(
				`a row that breaks a constraint, ${mode}`,
				onError,
				{
					operation: 'insert',
					...listed('people'),
					columns: auto,
					options: { ...options, outputColumns: ['name'] },
				},
				{ items: NEW_PEOPLE },
			),
			operation(`a table to truncate that is not there, ${mode}`, onError, {
				operation: 'deleteTable',
				...listed('nothing'),
				deleteCommand: 'truncate',
				options,
			}),
		]),
		query('one item and a failure', onError, SECOND_FAILS, {}, { items: [{ a: 2 }] }),
		query(
			'a connection that the server refuses',
			onError,
			'SELECT 1 AS a',
			{},
			{
				credential: { port: 5999 },
			},
		),
		query('a wrong password', onError, 'SELECT 1 AS a', {}, { credential: { password: 'no' } }),
		operation('a where clause that is not valid', onError, {
			operation: 'select',
			...listed('people'),
			where: { values: [{ column: 'age', condition: 'bad', value: 1 }] },
		}),
		operation(
			'a where clause that is not valid and no connection',
			onError,
			{
				operation: 'select',
				...listed('people'),
				where: { values: [{ column: 'age', condition: 'bad', value: 1 }] },
			},
			{ credential: { port: 5999 } },
		),
		query('a message with the code of a common error', onError, 'SELECT homepermalink FROM t'),
		query('rows that are only an error', onError, "=SELECT 'x{{ $json.a }}' AS error"),
		query(
			'a row with an error, a message and details',
			onError,
			"SELECT 'x' AS error, 1 AS message, 2 AS details",
			{},
			{ items: [{ a: 1 }] },
		),
		query('rows with an error and one more column', onError, "SELECT 'x' AS error, 1 AS n"),
		query('rows with an error that is false', onError, 'SELECT false AS error'),
		query(
			'rows that are only an error, two for each item',
			onError,
			"=SELECT 'x{{ $json.a }}' AS error FROM generate_series(1, 2)",
			{ queryBatching: 'independently' },
		),
		query(
			'a statement without rows in version 2.2',
			onError,
			'=UPDATE pgcase.people SET age = 1 WHERE id = -{{ $json.a }}',
			{ queryBatching: 'transaction' },
			{ typeVersion: 2.2 },
		),
		operation(
			'a column that is not there',
			onError,
			{ operation: 'insert', ...listed('people'), columns: auto },
			{ items: [{ name: 'Dora', nothing: 1 }], host: true },
		),
		operation(
			'a row to update that is not there',
			onError,
			{
				operation: 'update',
				...listed('things'),
				columns: { ...auto, matchingColumns: ['id'] },
			},
			{ items: [{ id: 99, label: 'none' }], host: true },
		),
		operation(
			'rows to update',
			onError,
			{
				operation: 'update',
				...listed('things'),
				columns: { ...auto, matchingColumns: ['id'] },
				options: { outputColumns: ['id', 'label'] },
			},
			{
				items: [
					{ id: 1, label: 'uno' },
					{ id: 2, label: 'dos' },
				],
			},
		),
		operation(
			'rows to insert or update',
			onError,
			{
				operation: 'upsert',
				...listed('things'),
				columns: { ...auto, matchingColumns: ['id'] },
				options: { outputColumns: ['id', 'label'], queryBatching: 'independently' },
			},
			{
				items: [
					{ id: 1, label: 'uno' },
					{ id: 7, label: 'one', qty: 1 },
					{ id: 8, label: 'eight' },
				],
			},
		),
	]),
	...both((onError) => [
		// The first query fails, so n8n runs the node three times. The second query adds a row
		// in each run.
		query(
			'a node that tries again while its first item is an error',
			onError,
			"={{ $json.a === 1 ? 'SELECT nope' : 'INSERT INTO pgcase.people (name) SELECT count(*)::text FROM pgcase.people RETURNING id' }}",
			{ queryBatching: 'independently' },
			{ items: [{ a: 1 }, { a: 2 }], settings: { retryOnFail: true, waitBetweenTries: 1 } },
		),
		query(
			'a node that tries again and fails as a whole',
			onError,
			'SELECT 1 AS a',
			{ queryReplacement: '={{ $json }}' },
			{ settings: { retryOnFail: true, maxTries: 2, waitBetweenTries: 1 } },
		),
		query(
			'a node that tries again and gives rows',
			onError,
			'SELECT 1 AS a',
			{},
			{ settings: { retryOnFail: true, waitBetweenTries: 1 } },
		),
	]),
];
