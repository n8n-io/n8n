/**
 * Equivalence cases of the MySQL node for `select`, `insert`, `update`, `upsert` and
 * `deleteTable`, without a continue setting. The tables are in `MYSQL_SETUP` of
 * `mysql-cases.ts`.
 */
import type { MysqlCase } from './mysql-cases.ts';

type Values = Record<string, unknown>;

const listed = (table: string) => ({ table: { __rl: true, mode: 'list', value: table } });
const MODES: Array<[string, Values]> = [
	['single', {}],
	['independently', { queryBatching: 'independently' }],
	['transaction', { queryBatching: 'transaction' }],
];
const IDS = [{ id: 1 }, { id: 2 }, { id: 3 }];

function operation(name: string, parameters: Values, extra: Partial<MysqlCase> = {}): MysqlCase {
	return {
		name: `${String(parameters.operation)}, ${name}`,
		typeVersion: 2.5,
		parameters: { options: {}, ...parameters },
		recordFirst: true,
		...extra,
	};
}

function clause(column: string, condition: string, value: unknown = ''): Values {
	return { column, condition, value };
}

function select(name: string, parameters: Values, extra: Partial<MysqlCase> = {}): MysqlCase {
	return operation(name, { operation: 'select', ...listed('mycase_people'), ...parameters }, extra);
}

const byId = { where: { values: [clause('id', 'equal', '={{ $json.id }}')] } };

const SELECT: MysqlCase[] = [
	select('the first rows', {}),
	select('all rows', { returnAll: true }),
	select('a limit', { limit: 2 }),
	select('a limit that is text', { limit: '={{ "2" }}' }),
	select('two columns', { returnAll: true, options: { outputColumns: ['id', 'name'] } }),
	select('a star and a column', { returnAll: true, options: { outputColumns: ['id', '*'] } }),
	select('no column', { returnAll: true, options: { outputColumns: [] } }),
	select('distinct', {
		returnAll: true,
		table: { __rl: true, mode: 'name', value: 'mycase_types' },
		options: { outputColumns: ['label'], selectDistinct: true },
	}),
	select('equal to a text', { where: { values: [clause('name', 'equal', 'Ann')] } }),
	select('the sign of equal', { where: { values: [clause('name', '=', 'Bob')] } }),
	select('not equal', { where: { values: [clause('name', '!=', 'Ann')] } }),
	select('like', { where: { values: [clause('name', 'LIKE', '%y')] } }),
	select('greater than a number in a text', { where: { values: [clause('age', '>', '40')] } }),
	select('less than or equal', { where: { values: [clause('age', '<=', 31)] } }),
	select('greater than an empty text', { where: { values: [clause('age', '>=', '')] } }),
	select('is null', { where: { values: [clause('age', 'IS NULL')] } }),
	select('is not null, and a second clause', {
		where: { values: [clause('note', 'IS NOT NULL'), clause('id', '<', 3)] },
	}),
	select('two clauses with or', {
		where: { values: [clause('name', 'equal', 'Ann'), clause('age', 'IS NULL')] },
		combineConditions: 'OR',
	}),
	select('a value with an apostrophe, a semicolon and a backslash', {
		where: { values: [clause('note', 'equal', "it's; a \\ note")] },
	}),
	select('a value that is a list', {
		where: { values: [clause('id', 'equal', '={{ [2, 3] }}'), clause('name', '!=', 'x')] },
	}),
	select('a value that is null', { where: { values: [clause('age', 'equal', '={{ null }}')] } }),
	select('a value that is true', { where: { values: [clause('id', 'equal', '={{ true }}')] } }),
	select('sorted', {
		returnAll: true,
		sort: {
			values: [
				{ column: 'age', direction: 'DESC' },
				{ column: 'name', direction: 'ASC' },
			],
		},
	}),
	select('a clause, a sort rule and a limit', {
		where: { values: [clause('id', '>', 1)] },
		sort: { values: [{ column: 'id', direction: 'DESC' }] },
		limit: 1,
	}),
	select('no rows', { where: { values: [clause('id', '>', 100)] } }),
	select(
		'no rows in version 2.1',
		{ where: { values: [clause('id', '>', 100)] } },
		{
			typeVersion: 2.1,
		},
	),
	select('detailed', { limit: 2, options: { detailedOutput: true } }),
	select('a table that is not there', { table: { __rl: true, mode: 'name', value: 'mycase_no' } }),
	select('a table name with a backtick', {
		table: { __rl: true, mode: 'name', value: 'mycase`people' },
	}),
	select('a column that is not there', { options: { outputColumns: ['nope'] } }),
	select('a comparison with a text that is not a number', {
		where: { values: [clause('age', '>', 'old')] },
	}),
	select('a condition that is not valid', { where: { values: [clause('age', 'bad', 1)] } }),
	select(
		'a comparison with null',
		{ where: { values: [clause('age', '>', '={{ null }}')] } },
		{
			host: true,
		},
	),
	select(
		'a clause without a value',
		{ where: { values: [{ column: 'age', condition: '>' }] } },
		{
			host: true,
		},
	),
	...MODES.flatMap(([mode, options]) => [
		select(`a row for each item, ${mode}`, { ...byId, options }, { items: IDS }),
		select(
			`a row for each item, detailed, ${mode}`,
			{
				...byId,
				options: { ...options, detailedOutput: true },
			},
			{ items: IDS },
		),
		select(
			`a failure of the second item, ${mode}`,
			{
				where: { values: [clause("={{ $json.id === 2 ? 'nope' : 'id' }}", 'equal', 1)] },
				options,
			},
			{ items: IDS },
		),
	]),
	select(
		'a row for each item in version 2.3',
		{ ...byId, options: { queryBatching: 'independently' } },
		{
			items: IDS,
			typeVersion: 2.3,
		},
	),
	select(
		'a value with a semicolon in version 2.3',
		{
			where: { values: [clause('note', 'equal', 'a;b')] },
			options: { queryBatching: 'transaction' },
		},
		{ typeVersion: 2.3 },
	),
];

function insert(name: string, parameters: Values, extra: Partial<MysqlCase> = {}): MysqlCase {
	return operation(name, { operation: 'insert', ...listed('mycase_people'), ...parameters }, extra);
}

const NEW_PEOPLE = [
	{ name: 'Dora', age: 5 },
	{ name: "O'Neil; x", note: 'a\\b "q" \n é 😀' },
	{ age: null, note: '' },
];
const manual = (values: Values[]) => ({ dataMode: 'defineBelow', valuesToSend: { values } });
const NAME_AND_AGE = manual([
	{ column: 'name', value: '={{ $json.name }}' },
	{ column: 'age', value: 7 },
]);

const INSERT: MysqlCase[] = [
	...MODES.flatMap(([mode, options]) => [
		insert(
			`the input items, ${mode}`,
			{ dataMode: 'autoMapInputData', options },
			{
				items: NEW_PEOPLE,
			},
		),
		insert(`values of the node, ${mode}`, { ...NAME_AND_AGE, options }, { items: NEW_PEOPLE }),
		insert(
			`detailed, ${mode}`,
			{ options: { ...options, detailedOutput: true } },
			{
				items: [{ name: 'Dora' }, { name: 'Emil' }],
			},
		),
		insert(
			`a text that is there, ${mode}`,
			{ ...listed('mycase_log'), options },
			{
				items: [{ text: 'a' }, { text: 'start' }, { text: 'b' }],
			},
		),
		insert(
			`a text that is there, skipped, ${mode}`,
			{
				...listed('mycase_log'),
				options: { ...options, skipOnConflict: true },
			},
			{ items: [{ text: 'a' }, { text: 'start' }, { text: 'b' }] },
		),
		insert(
			`low priority, ${mode}`,
			{ options: { ...options, priority: 'LOW_PRIORITY' } },
			{
				items: [{ name: 'Dora' }],
			},
		),
		insert(
			`empty strings as null, ${mode}`,
			{
				options: { ...options, replaceEmptyStrings: true },
			},
			{
				items: [
					{ name: '', note: '' },
					{ name: 'x', note: '' },
				],
			},
		),
	]),
	insert(
		'high priority and skipped',
		{
			...listed('mycase_log'),
			options: { priority: 'HIGH_PRIORITY', skipOnConflict: true },
		},
		{ items: [{ text: 'start' }] },
	),
	insert('no data mode in the parameters', {}, { items: [{ name: 'Dora' }] }),
	insert(
		'values of each type',
		{},
		{
			items: [
				{ name: true, age: '12', note: { a: 1, b: [1, 'x'] } },
				{ name: 1.5, note: [1, 'a', null] },
			],
		},
	),
	insert('an item without a field', {}, { items: [{}] }),
	insert('a column that is not there', {}, { items: [{ name: 'Dora', nothing: 1 }] }),
	insert('a column name with a dot and a backtick', {}, { items: [{ 'a.b': 1, 'c`d': 2 }] }),
	insert('two values for one column', {
		...manual([
			{ column: 'name', value: 'first' },
			{ column: 'age', value: 1 },
			{ column: 'name', value: 'second' },
		]),
	}),
	insert('a value of the node that is null', manual([{ column: 'name', value: '={{ null }}' }])),
	insert(
		'items with other columns in one query',
		manual([{ column: '={{ $json.c }}', value: 'v' }]),
		{
			items: [{ c: 'name' }, { c: 'note' }],
		},
	),
	insert('in version 2', {}, { items: [{ name: 'Dora' }], typeVersion: 2 }),
	insert(
		'in version 2.3, a value with a semicolon',
		{ options: { queryBatching: 'independently' } },
		{
			items: [{ name: 'a;b' }],
			typeVersion: 2.3,
		},
	),
	insert('a column name that is a number', {}, { items: [{ name: 'Dora', '1': 'x' }], host: true }),
	insert(
		'a priority that is not a value of the option',
		{ options: { priority: 'DELAYED' } },
		{
			items: [{ name: 'Dora' }],
			host: true,
		},
	),
	insert('values to send that are not there', { dataMode: 'defineBelow' }, { host: true }),
];

function update(name: string, parameters: Values, extra: Partial<MysqlCase> = {}): MysqlCase {
	return operation(
		name,
		{
			operation: 'update',
			...listed('mycase_people'),
			columnToMatchOn: 'id',
			...parameters,
		},
		extra,
	);
}

const CHANGES = [
	{ id: 1, name: "Ann's", note: null },
	{ id: 2, age: 46 },
	{ id: 99, name: 'none' },
];
const BY_NAME = {
	columnToMatchOn: 'name',
	valueToMatchOn: '={{ $json.who }}',
	...manual([
		{ column: 'note', value: '={{ $json.n }}' },
		{ column: 'age', value: 1 },
	]),
};
const WHO = [
	{ who: 'Ann', n: 'x;y' },
	{ who: 'Cy', n: null },
];

const UPDATE: MysqlCase[] = [
	...MODES.flatMap(([mode, options]) => [
		update(`the input items, ${mode}`, { options }, { items: CHANGES }),
		update(`values of the node, ${mode}`, { ...BY_NAME, options }, { items: WHO }),
		update(
			`detailed, ${mode}`,
			{ options: { ...options, detailedOutput: true } },
			{
				items: CHANGES,
			},
		),
		update(
			`a column that is not there in the second item, ${mode}`,
			{ options },
			{
				items: [
					{ id: 1, name: 'A' },
					{ id: 2, nope: 1 },
					{ id: 3, name: 'C' },
				],
			},
		),
	]),
	update('a row that does not change', {}, { items: [{ id: 1, name: 'Ann' }] }),
	update('only the column to match on', {}, { items: [{ id: 1 }] }),
	update('an item without the column to match on', {}, { items: [{ name: 'x' }] }),
	update(
		'no column to match on in the parameters',
		{ columnToMatchOn: undefined },
		{
			items: [{ id: 1, name: 'x' }],
		},
	),
	update('a value that is an object', {}, { items: [{ id: 1, note: { a: "it's" } }] }),
	update(
		'empty strings as null',
		{ options: { replaceEmptyStrings: true } },
		{
			items: [{ id: 1, name: '', note: '' }],
		},
	),
	update('the value to match on comes first in the values', {
		columnToMatchOn: 'id',
		valueToMatchOn: 2,
		...manual([
			{ column: 'id', value: 50 },
			{ column: 'name', value: 'B' },
		]),
	}),
	update('in version 2.1', {}, { items: [{ id: 1, name: 'A' }], typeVersion: 2.1 }),
	update(
		'a column to match on that an object of JavaScript has',
		{ columnToMatchOn: 'toString' },
		{
			items: [{ id: 1, name: 'x' }],
			host: true,
		},
	),
];

function upsert(name: string, parameters: Values, extra: Partial<MysqlCase> = {}): MysqlCase {
	return operation(
		name,
		{
			operation: 'upsert',
			...listed('mycase_people'),
			columnToMatchOn: 'id',
			...parameters,
		},
		extra,
	);
}

const UPSERT: MysqlCase[] = [
	...MODES.flatMap(([mode, options]) => [
		upsert(
			`the input items, ${mode}`,
			{ options },
			{
				items: [
					{ id: 1, name: "Ann's" },
					{ id: 9, name: 'New', age: 3 },
					{ id: 2, name: 'Bob' },
				],
			},
		),
		upsert(
			`values of the node, ${mode}`,
			{
				...listed('mycase_log'),
				columnToMatchOn: 'text',
				valueToMatchOn: '={{ $json.t }}',
				...manual([{ column: 'id', value: '={{ $json.id }}' }]),
				options,
			},
			{
				items: [
					{ t: 'start', id: 20 },
					{ t: 'more', id: 21 },
				],
			},
		),
		upsert(
			`detailed, ${mode}`,
			{ options: { ...options, detailedOutput: true } },
			{
				items: [
					{ id: 1, name: 'A' },
					{ id: 9, name: 'N' },
				],
			},
		),
	]),
	upsert('only the column to match on', {}, { items: [{ id: 1 }] }),
	upsert('a column that is not there', {}, { items: [{ id: 1, nope: 2 }] }),
	upsert('the value to match on replaces a value of the node', {
		valueToMatchOn: 3,
		...manual([
			{ column: 'id', value: 1 },
			{ column: 'name', value: 'C' },
		]),
	}),
	upsert(
		'empty strings as null',
		{ options: { replaceEmptyStrings: true } },
		{
			items: [{ id: 1, name: '', note: 'n' }],
		},
	),
];

function remove(name: string, parameters: Values, extra: Partial<MysqlCase> = {}): MysqlCase {
	return operation(
		name,
		{ operation: 'deleteTable', ...listed('mycase_people'), ...parameters },
		extra,
	);
}

const DELETE: MysqlCase[] = [
	remove('truncate, without a command in the parameters', {}),
	remove('truncate', { deleteCommand: 'truncate', ...listed('mycase_log') }),
	remove('truncate, detailed', { deleteCommand: 'truncate', options: { detailedOutput: true } }),
	remove('drop', { deleteCommand: 'drop', ...listed('mycase_log') }),
	remove('drop a table that is not there', {
		deleteCommand: 'drop',
		table: { __rl: true, mode: 'name', value: 'mycase_no' },
	}),
	remove('truncate a table that is not there', {
		deleteCommand: 'truncate',
		table: { __rl: true, mode: 'name', value: 'mycase_no' },
	}),
	remove('delete all rows', { deleteCommand: 'delete' }),
	remove('delete some rows', {
		deleteCommand: 'delete',
		where: { values: [clause('id', '>', 1), clause('note', 'IS NULL')] },
	}),
	remove('delete with or', {
		deleteCommand: 'delete',
		where: { values: [clause('name', 'equal', 'Ann'), clause('name', 'LIKE', 'C%')] },
		combineConditions: 'OR',
	}),
	remove('delete no row', { deleteCommand: 'delete', where: { values: [clause('id', '>', 100)] } }),
	remove('a command that is not valid', { deleteCommand: 'erase' }),
	remove('a condition that is not valid', {
		deleteCommand: 'delete',
		where: { values: [clause('id', 'bad', 1)] },
	}),
	...MODES.flatMap(([mode, options]) => [
		remove(
			`a row for each item, ${mode}`,
			{ deleteCommand: 'delete', ...byId, options },
			{
				items: [{ id: 1 }, { id: 3 }],
			},
		),
		remove(
			`a failure of the second item, ${mode}`,
			{
				deleteCommand: 'delete',
				where: {
					values: [clause("={{ $json.id === 2 ? 'nope' : 'id' }}", 'equal', '={{ $json.id }}')],
				},
				options,
			},
			{ items: IDS },
		),
	]),
];

export const MYSQL_OPERATION_CASES: MysqlCase[] = [
	...SELECT,
	...INSERT,
	...UPDATE,
	...UPSERT,
	...DELETE,
];
