/**
 * Equivalence cases of the MySQL node with a continue setting ("continue" and "continue
 * (using error output)"). The v1 node runs in n8n's engine, which makes the error items and
 * the error output. The tables are in `MYSQL_SETUP` of `mysql-cases.ts`.
 */
import type { MysqlCase } from './mysql-cases.ts';

type Values = Record<string, unknown>;

type OnError = NonNullable<MysqlCase['onError']>;
const REGULAR: OnError = 'continueRegularOutput';
const ERRORS: OnError = 'continueErrorOutput';
const THREE = [{ a: 1 }, { a: 2 }, { a: 3 }];
/** The query of the second item names a column that is not there. */
const SECOND_FAILS = "SELECT {{ $json.a === 2 ? 'nope' : 'id' }} FROM mycase_people LIMIT 1";
const MODES: Array<[string, Values]> = [
	['single', {}],
	['transaction', { queryBatching: 'transaction' }],
	['independently', { queryBatching: 'independently' }],
];

const listed = (table: string) => ({ table: { __rl: true, mode: 'list', value: table } });

function setting(onError: OnError): string {
	return onError === REGULAR ? 'continue' : 'error output';
}

function query(
	name: string,
	onError: OnError,
	text: string,
	options: Values = {},
	extra: Partial<MysqlCase> = {},
): MysqlCase {
	return {
		name: `${setting(onError)}, executeQuery, ${name}`,
		typeVersion: 2.5,
		parameters: { operation: 'executeQuery', query: text, options },
		items: THREE,
		onError,
		recordFirst: true,
		...extra,
	};
}

function operation(
	name: string,
	onError: OnError,
	parameters: Values,
	extra: Partial<MysqlCase> = {},
): MysqlCase {
	return {
		name: `${setting(onError)}, ${String(parameters.operation)}, ${name}`,
		typeVersion: 2.5,
		parameters: { options: {}, ...parameters },
		items: THREE,
		onError,
		recordFirst: true,
		...extra,
	};
}

function both(make: (onError: OnError) => MysqlCase[]): MysqlCase[] {
	return [...make(REGULAR), ...make(ERRORS)];
}

const BAD_WHERE = { values: [{ column: 'age', condition: 'bad', value: 1 }] };
const TEXTS = [{ text: 'a' }, { text: 'start' }, { text: 'b' }];

export const MYSQL_CONTINUE_CASES: MysqlCase[] = [
	...both((onError) => [
		...MODES.flatMap(([mode, options]) => [
			query(`rows, ${mode}`, onError, 'SELECT {{ $json.a }} AS n', options),
			query(`rows, detailed, ${mode}`, onError, 'SELECT {{ $json.a }} AS n', {
				...options,
				detailedOutput: true,
			}),
			query(`a failure of the second query, ${mode}`, onError, SECOND_FAILS, options),
			query(`a syntax error in each query, ${mode}`, onError, 'SELEC {{ $json.a }}', options),
			query(
				`a failure of the second statement of the second item, ${mode}`,
				onError,
				"INSERT INTO mycase_log (text) VALUES ('t{{ $json.a }}'); SELECT {{ $json.a === 2 ? 'nope' : 'id' }} FROM mycase_log LIMIT 1; INSERT INTO mycase_log (text) VALUES ('u{{ $json.a }}')",
				options,
			),
			query(`a parameter without a value in the second item, ${mode}`, onError, 'SELECT $1 AS a', {
				...options,
				queryReplacement: "={{ $json.a === 2 ? [] : ['x'] }}",
			}),
			operation(`a table that is not there, ${mode}`, onError, {
				operation: 'select',
				table: { __rl: true, mode: 'name', value: 'mycase_no' },
				options,
			}),
			operation(`a comparison that fails in the second item, ${mode}`, onError, {
				operation: 'select',
				...listed('mycase_people'),
				where: {
					values: [{ column: 'id', condition: '>=', value: "={{ $json.a === 2 ? 'x' : 3 }}" }],
				},
				options,
			}),
			operation(
				`a text that is there, ${mode}`,
				onError,
				{
					operation: 'insert',
					...listed('mycase_log'),
					options,
				},
				{ items: TEXTS },
			),
			operation(
				`a column that is not there in the second item, ${mode}`,
				onError,
				{
					operation: 'update',
					...listed('mycase_people'),
					columnToMatchOn: 'id',
					options,
				},
				{
					items: [
						{ id: 1, name: 'A' },
						{ id: 2, nope: 1 },
						{ id: 3, name: 'C' },
					],
				},
			),
			operation(
				`rows to insert or update, ${mode}`,
				onError,
				{
					operation: 'upsert',
					...listed('mycase_people'),
					columnToMatchOn: 'id',
					options,
				},
				{
					items: [
						{ id: 1, name: 'A' },
						{ id: 9, nope: 1 },
						{ id: 8, name: 'N' },
					],
				},
			),
			operation(`a table to truncate that is not there, ${mode}`, onError, {
				operation: 'deleteTable',
				table: { __rl: true, mode: 'name', value: 'mycase_no' },
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
		query(
			'a connection that the server refuses, independently',
			onError,
			'SELECT 1 AS a',
			{ queryBatching: 'independently' },
			{ credential: { port: 5999 } },
		),
		query('a wrong password', onError, 'SELECT 1 AS a', {}, { credential: { password: 'no' } }),
		operation('a where clause that is not valid', onError, {
			operation: 'select',
			...listed('mycase_people'),
			where: BAD_WHERE,
		}),
		operation(
			'a where clause that is not valid and no connection',
			onError,
			{ operation: 'select', ...listed('mycase_people'), where: BAD_WHERE },
			{ credential: { port: 5999 } },
		),
		operation('a delete command that is not valid', onError, {
			operation: 'deleteTable',
			...listed('mycase_people'),
			deleteCommand: 'erase',
		}),
		query('a message with the code of a common error', onError, 'SELECT enoent FROM mycase_log'),
		query('rows that are only an error', onError, "SELECT 'x{{ $json.a }}' AS error"),
		query(
			'a row with an error, a message and details',
			onError,
			"SELECT 'x' AS error, 1 AS message, 2 AS details",
			{},
			{ items: [{ a: 1 }] },
		),
		query('rows with an error and one more column', onError, "SELECT 'x' AS error, 1 AS n"),
		query('rows with an error that is 0', onError, 'SELECT 0 AS error'),
		query(
			'rows that are only an error, two for each item',
			onError,
			"SELECT 'x{{ $json.a }}' AS error UNION ALL SELECT 'y{{ $json.a }}'",
			{ queryBatching: 'independently' },
		),
		query(
			'a statement without rows in version 2.1',
			onError,
			'UPDATE mycase_people SET age = 1 WHERE id = -{{ $json.a }}',
			{ queryBatching: 'transaction' },
			{ typeVersion: 2.1 },
		),
		operation(
			'rows to update',
			onError,
			{
				operation: 'update',
				...listed('mycase_people'),
				columnToMatchOn: 'id',
			},
			{
				items: [
					{ id: 1, name: 'uno' },
					{ id: 2, name: 'dos' },
				],
			},
		),
		operation(
			'empty strings as null in the item of an error',
			onError,
			{
				operation: 'update',
				...listed('mycase_people'),
				columnToMatchOn: 'id',
				options: { replaceEmptyStrings: true, queryBatching: 'independently' },
			},
			{ items: [{ id: 1, nope: '' }] },
		),
	]),
	...both((onError) => [
		// The one text fails, so n8n runs the node again.
		query(
			'a node that tries again while its first item is an error',
			onError,
			"INSERT INTO mycase_log (text) VALUES (CONCAT('r', (SELECT COUNT(*) FROM mycase_people))); SELECT nope",
			{},
			{ items: [{ a: 1 }], settings: { retryOnFail: true, maxTries: 2, waitBetweenTries: 1 } },
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
