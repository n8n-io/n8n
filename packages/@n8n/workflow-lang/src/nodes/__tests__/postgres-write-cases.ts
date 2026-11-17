/**
 * Equivalence cases of the Postgres node: `insert`, `update` and `upsert`, and a query
 * text with `{{ }}` parts that the v1 node evaluates itself. The tables are in
 * `POSTGRES_SETUP` of `postgres-cases.ts`.
 */
import type { PostgresCase } from './postgres-cases.ts';

type Values = Record<string, unknown>;

const listed = (table: string) => ({
	schema: { __rl: true, mode: 'list', value: 'pgcase' },
	table: { __rl: true, mode: 'list', value: table },
});

/** The fields of the resource mapper, as the editor stores them. */
function fields(types: Record<string, string>, extra: Record<string, Values> = {}): Values[] {
	return Object.entries(types).map(([id, type]) => ({
		id,
		displayName: id,
		required: false,
		defaultMatch: false,
		display: true,
		type,
		canBeUsedToMatch: true,
		...extra[id],
	}));
}

const PLAIN = {
	id: 'number',
	label: 'string',
	qty: 'number',
	price: 'number',
	ok: 'boolean',
	doc: 'object',
	at: 'dateTime',
};
const THINGS = {
	id: 'number',
	label: 'string',
	qty: 'number',
	price: 'number',
	ok: 'boolean',
	doc: 'object',
	raw: 'object',
	tags: 'array',
	nums: 'array',
	day: 'dateTime',
	at: 'dateTime',
	plain: 'dateTime',
	lunch: 'time',
	feel: 'options',
	note: 'string',
};
const MOODS = {
	feel: {
		options: [
			{ name: 'sad', value: 'sad' },
			{ name: 'ok', value: 'ok' },
			{ name: 'happy', value: 'happy' },
		],
	},
};

/** Automatic mapping of the input item. */
const auto = (matchingColumns: string[] = []) => ({
	columns: { mappingMode: 'autoMapInputData', value: null, matchingColumns, schema: [] },
});

/** Values that the node defines, with the fields of the table `plain`. */
const plainValues = (value: Values | null, matchingColumns: string[] = [], extra = {}) => ({
	columns: {
		mappingMode: 'defineBelow',
		value,
		matchingColumns,
		schema: fields(PLAIN, extra),
		attemptToConvertTypes: false,
		convertFieldsToString: false,
	},
});

/** Values that the node defines, with the fields of the table `things`. */
const thingValues = (value: Values | null, matchingColumns: string[] = []) => ({
	columns: {
		mappingMode: 'defineBelow',
		value,
		matchingColumns,
		schema: fields(THINGS, MOODS),
	},
});

function write(operation: string) {
	return (
		name: string,
		table: string,
		parameters: Values,
		extra: Partial<PostgresCase> = {},
	): PostgresCase => ({
		name: `${operation}, ${name}`,
		typeVersion: 2.6,
		parameters: { operation, ...listed(table), options: {}, ...parameters },
		...extra,
	});
}

const insert = write('insert');
const update = write('update');
const upsert = write('upsert');
const some = { options: { outputColumns: ['id', 'label', 'qty'] } };

function text(
	name: string,
	query: string,
	items: Values[],
	options: Values = {},
	extra: Partial<PostgresCase> = {},
): PostgresCase {
	return {
		name: `executeQuery, ${name}`,
		typeVersion: 2.6,
		parameters: { operation: 'executeQuery', query, options },
		items,
		...extra,
	};
}

export const POSTGRES_QUERY_TEXT_CASES: PostgresCase[] = [
	text(
		'a part of the query text for each item',
		'SELECT name FROM pgcase.people WHERE age > {{ $json.age }} ORDER BY id',
		[{ age: 30 }, { age: 60 }],
	),
	text('a text part in quotes', "SELECT id FROM pgcase.people WHERE name = '{{ $json.name }}'", [
		{ name: 'Bob' },
	]),
	text(
		'parts and query parameters',
		'SELECT id FROM pgcase.people WHERE age > {{ $json.age }} AND name <> $1 ORDER BY id',
		[{ age: 20, name: 'Bob' }],
		{ queryReplacement: '={{ $json.name }}' },
	),
	text(
		'the same part two times',
		"SELECT {{ $json.a }} AS a, '{{ $json.b }}' AS b, {{ $json.a }} AS c",
		[{ a: 4, b: 'x' }],
	),
	text(
		'a part that is a list',
		'SELECT id FROM pgcase.people WHERE age IN ({{ $json.ages }}) ORDER BY id',
		[{ ages: [34, 61] }],
	),
	text('a part that is true or a fraction', 'SELECT {{ $json.flag }} AS flag, {{ $json.n }} AS n', [
		{ flag: true, n: 1.5 },
	]),
	text(
		'a part with the patterns of a replacement',
		"SELECT '{{ $json.a }}' AS a, '{{ $json.b }}' AS b",
		[{ a: 'x$$y$&z', b: 'cost $ 5' }],
	),
	text(
		'a part that gives a part',
		"SELECT '{{ $json.a }}' AS a, {{ $json.b }} AS b",
		[{ a: '{{ $json.b }}', b: 7 }],
		{},
		{ host: true },
	),
	text(
		'a part with the text before it as its replacement',
		"SELECT 1 AS a, '{{ $json.b }}' AS b",
		[{ b: '$`' }],
		{},
		{ host: true },
	),
	text(
		'a part with a calculation',
		"SELECT '{{ $json.name.toUpperCase() }}' AS name, {{ $json.age + 1 }} AS age",
		[{ name: 'ann', age: 2 }],
	),
	text(
		'a part that makes two commands',
		'SELECT 1 AS a{{ $json.more }}',
		[{ more: '; SELECT 2 AS b' }],
		{},
		{ host: true },
	),
	text('a part that is null', 'SELECT {{ $json.none }} AS a', [{ none: null }], {}, { host: true }),
	text(
		'a part that is an object',
		"SELECT '{{ $json.o }}' AS a",
		[{ o: { a: 1 } }],
		{},
		{ host: true },
	),
	text(
		'a write with parts for each item',
		"UPDATE pgcase.people SET age = {{ $json.age }} WHERE name = '{{ $json.name }}' RETURNING id, age",
		[
			{ name: 'Ann', age: 35 },
			{ name: 'Bob', age: 28 },
		],
	),
	text(
		'empty strings as null with a part',
		"SELECT '{{ $json.name }}' AS name",
		[{ name: '' }],
		{ replaceEmptyStrings: true },
		{ convertHost: true },
	),
	text(
		'empty strings as null with a query parameter',
		'SELECT $1 AS name',
		[{ name: '' }],
		{ replaceEmptyStrings: true, queryReplacement: '={{ $json.name }}' },
		{ convertHost: true },
	),
	text(
		'escape strings',
		"SELECT E'it\\'s' AS a, e'tab\\there\\\\' AS b, id FROM pgcase.people WHERE name = $1",
		[{ name: 'Bob' }],
		{ queryReplacement: '={{ $json.name }}' },
	),
	text(
		'a variable in an escape string',
		"SELECT E'a\\' $1 b' AS a",
		[{}],
		{ queryReplacement: 'x' },
		{ host: true },
	),
	text('an escape string without an end', "SELECT E'abc\\' AS a", [{}], {}, { host: true }),
	text('empty strings as null without an expression', "SELECT '' AS name", [{ name: '' }], {
		replaceEmptyStrings: true,
	}),
];

export const POSTGRES_WRITE_CASES: PostgresCase[] = [
	insert('the input items', 'plain', auto(), {
		items: [
			{ label: 'a', qty: 5 },
			{ label: 'b', qty: 6, price: 1.25, ok: true },
		],
	}),
	insert(
		'chosen output columns',
		'plain',
		{ ...auto(), ...some },
		{ items: [{ label: 'a' }, { label: 'b' }] },
	),
	insert('a column that is not there', 'plain', auto(), { items: [{ label: 'a', nope: 1 }] }),
	insert('null for a column that is not nullable', 'plain', auto(), {
		items: [{ label: 'a' }, { label: null }],
	}),
	insert('a table that is not there', 'nothing', auto(), { items: [{ label: 'a' }] }),
	insert(
		'a conflict that the node skips',
		'things',
		{ ...auto(), options: { skipOnConflict: true, outputColumns: ['id'] } },
		{ items: [{ id: 1, label: 'again' }] },
	),
	insert(
		'a conflict and a new row',
		'things',
		{ ...auto(), options: { skipOnConflict: true, outputColumns: ['id', 'label'] } },
		{
			items: [
				{ id: 1, label: 'again' },
				{ id: 3, label: 'three' },
			],
		},
	),
	insert(
		'a conflict',
		'things',
		{ ...auto(), ...some },
		{
			items: [
				{ id: 3, label: 'three' },
				{ id: 1, label: 'again' },
			],
		},
	),
	insert('an item without values', 'plain', auto(), { items: [{}] }),
	insert('an item without values in version 2.5', 'plain', auto(), {
		items: [{}],
		typeVersion: 2.5,
	}),
	insert('an object for a JSON column', 'plain', auto(), {
		items: [{ label: 'a', doc: { a: [1, { b: "it's" }], c: null } }],
	}),
	insert('a list for a JSON column', 'plain', auto(), {
		items: [{ label: 'a', doc: [1, 2] }],
		host: true,
	}),
	insert(
		'lists for array columns',
		'things',
		{ ...auto(), ...some },
		{
			items: [
				{ id: 3, label: 'a', tags: ['x', 'say "hi"', 'a,b', true, null, { k: 1 }], nums: [1, 2] },
				{ id: 4, label: 'b', tags: '["p","q"]', nums: [] },
			],
		},
	),
	insert('all columns of a table with array columns', 'things', auto(), {
		items: [{ id: 3, label: 'a' }],
		host: true,
	}),
	insert('no list for an array column that is not nullable', 'strict', auto(), {
		items: [{ id: 1 }],
	}),
	insert(
		'empty strings as null',
		'plain',
		{ ...auto(), options: { replaceEmptyStrings: true } },
		{ items: [{ label: 'a', 'Odd "Name': '' }] },
	),
	insert(
		'empty strings as null for a column that is not nullable',
		'plain',
		{ ...auto(), options: { replaceEmptyStrings: true } },
		{ items: [{ label: '' }] },
	),
	insert(
		'empty strings as null with an expression',
		'plain',
		{ ...plainValues({ label: '={{ $json.label }}' }), options: { replaceEmptyStrings: true } },
		{ items: [{ label: '' }], convertHost: true },
	),
	insert('numbers and booleans for text and number columns', 'plain', auto(), {
		items: [
			{ label: 5, qty: '7', price: 2 },
			{ label: true, qty: 1.5, price: '3.456' },
			{ label: 1e21, qty: -3, price: 1e-7 },
		],
	}),
	insert('text that is not a number', 'plain', auto(), { items: [{ label: 'a', qty: 'x' }] }),
	insert('a name with a quote', 'plain', auto(), {
		items: [{ label: "it's", 'Odd "Name': 'a "b" c' }],
	}),
	insert('a column with the name of an object member', 'plain', auto(), {
		items: [{ label: 'a', constructor: 1 }],
		host: true,
	}),
	insert(
		'defined values with expressions',
		'plain',
		plainValues({
			label: '={{ $json.label }}',
			qty: '={{ $json.qty }}',
			price: '4.50',
			ok: '={{ $json.ok }}',
			doc: '={{ $json.doc }}',
		}),
		{
			items: [
				{ label: 'a', qty: '5', ok: 'TRUE', doc: '{"a":1}' },
				{ label: 'b', qty: 6, ok: 0, doc: { b: [2] } },
			],
		},
	),
	insert(
		'a defined number that is not a number',
		'plain',
		plainValues({ label: 'a', qty: '={{ $json.qty }}' }),
		{ items: [{ qty: 1 }, { qty: 'many' }] },
	),
	insert(
		'a defined boolean that is not a boolean',
		'plain',
		plainValues({ label: 'a', ok: 'yes' }),
	),
	insert(
		'a defined object that is not an object',
		'plain',
		plainValues({ label: 'a', doc: '={{ $json.doc }}' }),
		{ items: [{ doc: '[1]' }] },
	),
	insert(
		'a defined object from text that is not JSON',
		'plain',
		plainValues({ label: 'a', doc: '{a: 1}' }),
		{ host: true },
	),
	insert(
		'a defined null for a column that is not nullable',
		'plain',
		plainValues({ label: '={{ $json.label }}', qty: 1 }),
		{ items: [{ label: null }] },
	),
	insert(
		'a required field without a value',
		'plain',
		plainValues({ label: 'a', qty: '={{ $json.qty }}' }, [], { qty: { required: true } }),
		{ items: [{ qty: null }] },
	),
	insert(
		'defined dates and times with an offset',
		'plain',
		{
			...plainValues({ label: '={{ $json.label }}', at: '={{ $json.at }}' }),
			options: { outputColumns: ['id', 'label', 'at'] },
		},
		{
			items: [
				{ label: 'a', at: '2024-03-04T05:06:07Z' },
				{ label: 'b', at: '2024-03-04T05:06:07.5+02:00' },
				{ label: 'c', at: ' 2024-02-29T23:59:59.123456-11:30 ' },
				{ label: 'd', at: '2024-03-04T05:06:07.007+00:00' },
			],
		},
	),
	insert(
		'a defined date and time without an offset',
		'plain',
		plainValues({ label: 'a', at: '2024-03-04T05:06:07' }),
		{ host: true },
	),
	insert('a defined date without a time', 'plain', plainValues({ label: 'a', at: '2024-03-04' }), {
		host: true,
	}),
	insert(
		'a defined date that is not in the calendar',
		'plain',
		plainValues({ label: 'a', at: '2023-02-29T00:00:00Z' }),
		{ host: true },
	),
	insert(
		'defined values for a table with a JSON column',
		'things',
		{
			...thingValues({
				id: '={{ $json.id }}',
				label: '={{ $json.label }}',
				raw: '={{ $json.raw }}',
				doc: '={{ $json.doc }}',
				qty: '={{ $json.qty }}',
			}),
			options: { outputColumns: ['id', 'label', 'qty', 'raw', 'doc'] },
		},
		{
			items: [
				{ id: 3, label: 'a', raw: { a: 1 }, doc: { b: 2 }, qty: '8' },
				{ id: 4, label: 'b', raw: 'text', doc: '{"c":3}', qty: null },
				{ id: 5, label: 'c', raw: null, doc: null, qty: 9 },
			],
		},
	),
	insert(
		'a defined null for a table with a JSON column',
		'things',
		{ ...thingValues({ id: 3, label: '={{ $json.label }}' }), ...some },
		{ items: [{ label: null }], host: true },
	),
	insert('defined values that are null', 'plain', plainValues(null), { host: true }),
	insert(
		'a transaction for the items',
		'plain',
		{ ...auto(), options: { queryBatching: 'transaction' } },
		{ items: [{ label: 'a' }, { label: 'b', qty: 'x' }] },
	),
	insert(
		'each item on its own',
		'plain',
		{ ...auto(), options: { queryBatching: 'independently' } },
		{ items: [{ label: 'a' }, { label: 'b', qty: 'x' }, { label: 'c' }] },
	),
	insert(
		'each item on its own without output rows',
		'things',
		{
			...auto(),
			options: { queryBatching: 'independently', skipOnConflict: true, ...some.options },
		},
		{
			items: [
				{ id: 1, label: 'again' },
				{ id: 3, label: 'three' },
			],
		},
	),
	insert(
		'a table for each item',
		'plain',
		{
			table: { __rl: true, mode: 'name', value: '={{ $json.t }}' },
			...plainValues({ label: '={{ $json.label }}', qty: '={{ $json.qty }}' }),
			...some,
		},
		{
			items: [
				{ t: 'plain', label: 'a', qty: 1 },
				{ t: 'things', label: 'b', qty: 2 },
			],
		},
	),
	insert(
		'large numbers as numbers',
		'people',
		{
			...auto(),
			options: { outputColumns: ['id', 'big', 'score'], largeNumbersOutput: 'numbers' },
		},
		{ items: [{ name: 'Fay', big: 12, score: '7.25' }] },
	),

	update(
		'the input items',
		'plain',
		{ ...auto(['id']), ...some },
		{ items: [{ id: 1, label: 'new', qty: 9 }] },
	),
	update('all columns of the row', 'plain', auto(['label']), {
		items: [{ label: 'first', qty: 4, price: '1.5', ok: false, doc: { a: 1 } }],
	}),
	update(
		'defined values',
		'things',
		{
			...thingValues(
				{
					id: '={{ $json.id }}',
					qty: '={{ $json.qty }}',
					ok: 'false',
					tags: '={{ $json.tags }}',
					nums: '[3, 4]',
					lunch: '12:30',
					feel: '={{ $json.feel }}',
					at: '2024-03-04T05:06:07.890+01:00',
					doc: '{"a": {"b": 1}}',
					raw: '={{ $json.raw }}',
					note: null,
				},
				['id'],
			),
			options: {
				outputColumns: ['id', 'qty', 'ok', 'lunch', 'feel', 'at', 'doc', 'raw', 'note'],
			},
		},
		{
			items: [
				{ id: 1, qty: '11', tags: ['a', 'b'], feel: 'ok', raw: { z: [1] } },
				{ id: 2, qty: 12, tags: "['c']", feel: 'happy', raw: '{"y": 2}' },
			],
		},
	),
	update(
		'an option that the field does not have',
		'things',
		thingValues({ id: 1, feel: 'angry' }, ['id']),
	),
	update('a time that is not a time', 'things', thingValues({ id: 1, lunch: 'noon' }, ['id'])),
	update(
		'times in the forms of the pattern',
		'things',
		{
			...thingValues({ id: '={{ $json.id }}', lunch: '={{ $json.lunch }}' }, ['id']),
			options: { outputColumns: ['id', 'lunch'] },
		},
		{
			items: [
				{ id: 1, lunch: '01:02:03' },
				{ id: 2, lunch: '04:05+0100' },
				{ id: 1, lunch: '06:07:08-02' },
				{ id: 2, lunch: '09:10+3:30' },
			],
		},
	),
	update(
		'a time with an end that is not in the pattern',
		'things',
		thingValues({ id: 1, lunch: '04:05+010' }, ['id']),
	),
	update(
		'a list that is not a list',
		'things',
		thingValues({ id: 1, tags: '={{ $json.tags }}' }, ['id']),
		{ items: [{ tags: '{"a":1}' }] },
	),
	update(
		'a list for a column that is not an array',
		'things',
		thingValues({ id: 1, note: '={{ $json.note }}' }, ['id']),
		{ items: [{ note: [1, 2] }], host: true },
	),
	update(
		'a row that is not there',
		'plain',
		{ ...auto(['id']), ...some },
		{
			items: [
				{ id: 1, qty: 2 },
				{ id: 99, qty: 3 },
			],
		},
	),
	update('no values to update', 'plain', auto(['id']), { items: [{ id: 1 }] }),
	update(
		'two columns to match on',
		'things',
		{ ...auto(['label', 'qty']), ...some, options: { outputColumns: ['id', 'note'] } },
		{ items: [{ label: 'two', qty: 2, note: 'hit' }] },
	),
	update('a column to match on that the item does not have', 'plain', auto(['id']), {
		items: [{ qty: 5 }],
	}),
	update('no column to match on', 'plain', auto([]), { items: [{ qty: 5 }] }),
	update('a value to match on of another type', 'plain', auto(['label']), {
		items: [{ label: 5, qty: 5 }],
	}),
	update(
		'text for a number column to match on',
		'plain',
		{ ...auto(['id']), ...some },
		{
			items: [{ id: '1', qty: '5' }],
		},
	),
	update('null for a column that is not nullable', 'plain', auto(['id']), {
		items: [{ id: 1, label: null }],
	}),
	update(
		'a defined null for a column that is not nullable',
		'plain',
		plainValues({ id: 1, label: '={{ $json.label }}' }, ['id']),
		{ items: [{ label: null }] },
	),
	update(
		'a transaction for the items',
		'plain',
		{ ...auto(['id']), options: { queryBatching: 'transaction', ...some.options } },
		{
			items: [
				{ id: 1, qty: 2 },
				{ id: 1, qty: 'x' },
			],
		},
	),
	update(
		'each item on its own',
		'plain',
		{ ...auto(['id']), options: { queryBatching: 'independently', ...some.options } },
		{
			items: [
				{ id: 1, qty: 2 },
				{ id: 1, qty: 'x' },
			],
		},
	),
	update('a column that is not there', 'plain', auto(['id']), { items: [{ id: 1, nope: 2 }] }),

	upsert(
		'a new row and a row that is there',
		'things',
		{ ...auto(['id']), ...some },
		{
			items: [
				{ id: 1, label: 'uno', qty: 10 },
				{ id: 7, label: 'seven', qty: 70 },
			],
		},
	),
	upsert(
		'defined values',
		'things',
		{
			...thingValues(
				{ id: '={{ $json.id }}', label: '={{ $json.label }}', ok: '={{ $json.ok }}' },
				['id'],
			),
			options: { outputColumns: ['id', 'label', 'ok'] },
		},
		{
			items: [
				{ id: '2', label: 'dos', ok: 'true' },
				{ id: 8, label: 'eight', ok: 1 },
			],
		},
	),
	upsert('a value to match on that is not set', 'things', auto(['id']), {
		items: [{ id: 0, label: 'zero' }],
	}),
	upsert('only the column to match on', 'things', auto(['id']), { items: [{ id: 1 }] }),
	upsert('no column to match on', 'things', auto([]), { items: [{ id: 1, label: 'a' }] }),
	upsert(
		'only columns to match on',
		'things',
		{ ...auto(['label', 'qty']), ...some },
		{
			items: [
				{ label: 'one', qty: 1 },
				{ label: 'new', qty: 5 },
			],
		},
	),
	upsert(
		'columns to match on without a constraint',
		'things',
		{ ...auto(['qty']), ...some },
		{ items: [{ id: 9, label: 'nine', qty: 1 }] },
	),
	upsert('a column that is not there', 'things', auto(['id']), { items: [{ id: 1, nope: 1 }] }),
	upsert(
		'each item on its own',
		'things',
		{ ...auto(['id']), options: { queryBatching: 'independently', ...some.options } },
		{
			items: [
				{ id: 1, label: 'uno' },
				{ id: 2, label: null },
			],
		},
	),
	upsert(
		'a transaction for the items',
		'things',
		{ ...auto(['id']), options: { queryBatching: 'transaction', ...some.options } },
		{
			items: [
				{ id: 1, label: 'uno' },
				{ id: 10, label: 'ten', qty: 'x' },
			],
		},
	),
	upsert(
		'lists for array columns',
		'things',
		{ ...auto(['id']), options: { outputColumns: ['id', 'label'] } },
		{ items: [{ id: 1, label: 'uno', tags: ['a'], nums: [1] }] },
	),
];

const older = (typeVersion: number, extra: Partial<PostgresCase> = {}) => ({
	typeVersion,
	...extra,
});
const people = { ...listed('people'), options: {} };

/** Versions 2.1 to 2.4 of the node. */
export const POSTGRES_VERSION_CASES: PostgresCase[] = [
	text(
		'query parameters from expressions in version 2.4',
		'SELECT name FROM pgcase.people WHERE name = $1 OR age > $2 ORDER BY id',
		[{ name: 'Bob', age: 50 }],
		{ queryReplacement: '={{ $json.name }}, {{ $json.age }}' },
		older(2.4),
	),
	text(
		'query parameters as text in version 2.4',
		'SELECT name FROM pgcase.people WHERE name = $1 OR age > $2 ORDER BY id',
		[{}],
		{ queryReplacement: 'Bob, 50' },
		older(2.4),
	),
	text(
		'a value with a comma in version 2.4',
		'SELECT id FROM pgcase.people WHERE name <> $1 ORDER BY id',
		[{ name: 'Ann, Bob' }],
		{ queryReplacement: '={{ $json.name }}' },
		older(2.4),
	),
	text(
		'an expression with a comma in version 2.4',
		'SELECT id FROM pgcase.people WHERE name <> $1 AND name <> $2 ORDER BY id',
		[{ name: 'Bob' }],
		{ queryReplacement: "={{ $json.name.replace('B', 'X') }}" },
		older(2.4),
	),
	text(
		'a number, a null and an object as values in version 2.3',
		'SELECT id FROM pgcase.people WHERE age = $1 AND ($2::text IS NULL) AND meta @> $3::jsonb',
		[{ age: 34, none: null, meta: { a: [1] } }],
		{ queryReplacement: '={{ $json.age }}, {{ $json.none }}, {{ $json.meta }}' },
		older(2.3),
	),
	text(
		'two expressions in one entry in version 2.4',
		'SELECT id FROM pgcase.people WHERE age > $1 AND age < $2 ORDER BY id',
		[{ low: 20, high: 40 }],
		{ queryReplacement: '={{ $json.low }} {{ $json.high }}' },
		older(2.4),
	),
	text(
		'a list as a value in version 2.4',
		'SELECT id FROM pgcase.people WHERE age IN ($1) ORDER BY id',
		[{ ages: [34, 27] }],
		{ queryReplacement: '={{ $json.ages }}, 1' },
		older(2.4, { host: true }),
	),
	text(
		'a part of the query text in version 2.2',
		'SELECT name FROM pgcase.people WHERE age > {{ $json.age }} ORDER BY id',
		[{ age: 30 }],
		{},
		older(2.2),
	),
	text(
		'rows in version 2.1',
		'SELECT id, name, seen, made FROM pgcase.people ORDER BY id',
		[{}],
		{},
		older(2.1),
	),
	text(
		'no rows of a select in version 2.2',
		'SELECT id FROM pgcase.people WHERE age > 100',
		[{}],
		{},
		older(2.2),
	),
	text(
		'no rows of a select in a transaction in version 2.2',
		'SELECT id FROM pgcase.people WHERE age > {{ $json.age }}',
		[{ age: 100 }, { age: 60 }, { age: 200 }],
		{ queryBatching: 'transaction' },
		older(2.2),
	),
	text(
		'no rows of each item on its own in version 2.2',
		"UPDATE pgcase.people SET age = 1 WHERE name = '{{ $json.name }}'",
		[{ name: 'Nobody' }, { name: 'Ann' }],
		{ queryBatching: 'independently' },
		older(2.2),
	),
	text(
		'no rows of a select in version 2.3',
		'SELECT id FROM pgcase.people WHERE age > 100',
		[{}],
		{},
		older(2.3),
	),
	{
		name: 'select, no rows in version 2.2',
		typeVersion: 2.2,
		parameters: {
			operation: 'select',
			...people,
			returnAll: true,
			options: { outputColumns: ['id'] },
			where: { values: [{ column: 'age', condition: '>', value: 100 }] },
		},
	},
	{
		name: 'select, rows in version 2.4',
		typeVersion: 2.4,
		parameters: {
			operation: 'select',
			...people,
			limit: 2,
			options: { outputColumns: ['id', 'name'] },
			sort: { values: [{ column: 'id', direction: 'DESC' }] },
		},
	},
	{
		name: 'deleteTable, delete without rows in version 2.2',
		typeVersion: 2.2,
		parameters: {
			operation: 'deleteTable',
			...listed('notes'),
			options: {},
			deleteCommand: 'delete',
			where: { values: [{ column: 'id', condition: 'equal', value: 5 }] },
		},
	},
	insert(
		'the input items in version 2.2',
		'plain',
		auto(),
		older(2.2, { items: [{ label: 'a', qty: 5 }] }),
	),
	insert(
		'a conflict that the node skips in version 2.2',
		'things',
		{ ...auto(), options: { skipOnConflict: true, outputColumns: ['id'] } },
		older(2.2, { items: [{ id: 1, label: 'again' }] }),
	),
	insert(
		'a conflict that the node skips in a transaction in version 2.2',
		'things',
		{
			...auto(),
			options: { skipOnConflict: true, outputColumns: ['id'], queryBatching: 'transaction' },
		},
		older(2.2, { items: [{ id: 1, label: 'again' }] }),
	),
	insert(
		'defined values in version 2.3',
		'plain',
		plainValues({ label: '={{ $json.label }}', qty: '={{ $json.qty }}', ok: 'true' }),
		older(2.3, { items: [{ label: 'a', qty: '5' }] }),
	),
	insert(
		'lists for array columns in version 2.3',
		'things',
		{ ...auto(), ...some },
		older(2.3, { items: [{ id: 3, label: 'a', tags: ['x'] }], host: true }),
	),
	insert(
		'lists for array columns in version 2.4',
		'things',
		{ ...auto(), ...some },
		older(2.4, { items: [{ id: 3, label: 'a', tags: ['x', 'y z'], nums: [1, 2] }] }),
	),
	insert('an item without values in version 2.4', 'plain', auto(), older(2.4, { items: [{}] })),
	update(
		'the input items in version 2.2',
		'plain',
		{ ...auto(['id']), ...some },
		older(2.2, { items: [{ id: 1, label: 'new', qty: 9 }] }),
	),
	update(
		'a row that is not there in version 2.3',
		'plain',
		auto(['id']),
		older(2.3, { items: [{ id: 99, qty: 3 }] }),
	),
	upsert(
		'a new row and a row that is there in version 2.4',
		'things',
		{ ...auto(['id']), ...some },
		older(2.4, {
			items: [
				{ id: 1, label: 'uno', qty: 10 },
				{ id: 7, label: 'seven', qty: 70 },
			],
		}),
	),
	insert(
		'the input items in version 2.1',
		'plain',
		auto(),
		older(2.1, { items: [{ label: 'a' }], convertHost: true }),
	),
];
