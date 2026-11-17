/**
 * Equivalence cases of the MySQL node. Each case runs the v1 node and the library node on a
 * real database with the same tables, and the test compares the output or the error, and
 * the tables afterwards.
 */

export interface MysqlCase {
	/** Unique name. The recording file uses it as the key. */
	name: string;
	typeVersion: number;
	/** The parameters of the v1 node, with n8n expressions. */
	parameters: Record<string, unknown>;
	/** Input items. The default is one empty item. */
	items?: Array<Record<string, unknown>>;
	/**
	 * The library node, or the `sql` effect, ends with a limit marker before a statement is
	 * committed, and the host runs the node.
	 */
	host?: boolean;
	/** The converter keeps the node in the host. */
	convertHost?: boolean;
	/** The error setting of the node. */
	onError?: 'continueRegularOutput' | 'continueErrorOutput';
	/** Values of the credential that differ from the test database (a failure of the connection). */
	credential?: Record<string, unknown>;
}

/** The tables of each case. The test runs these texts before each run of a node. */
export const MYSQL_SETUP = [
	'DROP TABLE IF EXISTS mycase_people',
	'DROP TABLE IF EXISTS mycase_log',
	'DROP TABLE IF EXISTS mycase_types',
	'DROP TABLE IF EXISTS mycase_made',
	'DROP PROCEDURE IF EXISTS mycase_two',
	'CREATE TABLE mycase_people (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(40), age INT, note TEXT)',
	"INSERT INTO mycase_people (name, age, note) VALUES ('Ann', 31, 'first'), ('Bob', 45, NULL), ('Cy', NULL, 'it''s; a \\\\ note')",
	'CREATE TABLE mycase_log (id INT AUTO_INCREMENT PRIMARY KEY, text VARCHAR(100) UNIQUE)',
	"INSERT INTO mycase_log (text) VALUES ('start')",
	'CREATE TABLE mycase_types (id INT PRIMARY KEY, tiny TINYINT, flag BOOLEAN, small SMALLINT, medium MEDIUMINT, whole INT UNSIGNED, big BIGINT, ubig BIGINT UNSIGNED, price DECIMAL(30,10), ratio FLOAT, wide DOUBLE, born DATE, seen DATETIME, exact DATETIME(6), stamp TIMESTAMP NULL, span TIME, yr YEAR, doc JSON, bytes BLOB, fixed BINARY(4), bits BIT(9), kind ENUM("a","b"), tags SET("x","y","z"), code CHAR(5), label VARCHAR(20), body TEXT)',
	`INSERT INTO mycase_types VALUES
		(1, -128, true, -32768, -8388608, 4294967295, -9223372036854775808, 18446744073709551615, '12345678901234567890.1234567890', 1.5, 1.7976931348623157e308, '2024-02-29', '2024-02-29 13:14:15', '2024-02-29 13:14:15.123456', '2024-02-29 13:14:15', '-838:59:59', 2024, '{"a":[1,2,{"b":null}],"n":12345678901234567890,"s":"é"}', x'00ff10', x'6162', b'101010101', 'b', 'x,z', 'ab', 'héllo 😀', 'text'),
		(2, 5, false, 5, 5, 5, 9007199254740991, 9007199254740993, '1.5', 0.1, -0.0, '1000-01-01', '1000-01-01 00:00:00', '9999-12-31 23:59:59.999999', '1970-01-01 00:00:01', '12:00:00', 1901, '[1,"x"]', '', '', b'0', 'a', '', '', '', ''),
		(3, NULL, NULL, NULL, NULL, NULL, 42, 42, '-0.0000000001', 3.4e38, 0.30000000000000004, NULL, NULL, NULL, NULL, NULL, NULL, 'null', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)`,
	'CREATE PROCEDURE mycase_two() BEGIN SELECT 1 AS x; SELECT 2 AS y; END',
];

/** The tables after a run, as text. */
export const MYSQL_STATE = [
	"SELECT GROUP_CONCAT(CONCAT_WS('|', id, IFNULL(name, '~'), IFNULL(age, '~'), IFNULL(note, '~')) ORDER BY id SEPARATOR ';') FROM mycase_people",
	"SELECT GROUP_CONCAT(CONCAT_WS('|', id, IFNULL(text, '~')) ORDER BY id SEPARATOR ';') FROM mycase_log",
	"SELECT GROUP_CONCAT(table_name ORDER BY table_name SEPARATOR ';') FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name LIKE 'mycase%'",
];

function query(
	name: string,
	text: string,
	options: Record<string, unknown> = {},
	extra: Partial<MysqlCase> = {},
): MysqlCase {
	return {
		name: `executeQuery, ${name}`,
		typeVersion: 2.5,
		parameters: { operation: 'executeQuery', query: text, options },
		...extra,
	};
}

const PEOPLE = [
	{ id: 1, name: 'Ann', word: "it's" },
	{ id: 2, name: 'Bob', word: 'a\\b' },
	{ id: 3, name: 'Cy', word: '' },
];

const BATCHING = ['independently', 'transaction'];

const READS: MysqlCase[] = [
	query('rows', 'SELECT id, name, age, note FROM mycase_people ORDER BY id'),
	query('no rows', 'SELECT id FROM mycase_people WHERE id > 100'),
	query('no rows after a comment', '/* all */SELECT id FROM mycase_people WHERE id > 100'),
	query(
		'no rows after a comment and a blank',
		'/* all */ SELECT id FROM mycase_people WHERE id > 100',
	),
	query('no rows, lower case', 'select id from mycase_people where id > 100'),
	query('each column type', 'SELECT * FROM mycase_types ORDER BY id'),
	query('each column type, large numbers as text', 'SELECT * FROM mycase_types ORDER BY id', {
		largeNumbersOutput: 'text',
	}),
	query('each column type, large numbers as numbers', 'SELECT * FROM mycase_types ORDER BY id', {
		largeNumbersOutput: 'numbers',
	}),
	query('each column type, decimals as numbers', 'SELECT * FROM mycase_types ORDER BY id', {
		decimalNumbers: true,
	}),
	query(
		'computed columns',
		'SELECT 1 AS a, 2 AS a, 1+1, 1.5, 1e0, NULL, "s", 0x41, TRUE, COUNT(*), SUM(age), AVG(age), 10/3, 10 DIV 3, CAST(1 AS UNSIGNED), JSON_OBJECT("a", 1), 9007199254740993, NOW() > 0 FROM mycase_people',
	),
	query('two selects in one query', 'SELECT 1 AS a; SELECT 2 AS b'),
	query(
		'a select, a write and a select',
		"SELECT 1 AS a; INSERT INTO mycase_log (text) VALUES ('w'); SELECT text FROM mycase_log ORDER BY id",
	),
	query('a line comment with a semicolon', 'SELECT 1 AS a -- one; two\n'),
	query('a semicolon in a string', "SELECT 'a;b' AS a"),
	query('a semicolon in a double-quoted string', 'SELECT "a;b" AS a'),
	query('a variable of the session in one text', 'SET @v = 41; SELECT @v + 1 AS v'),
	query('a show command', "SHOW TABLES LIKE 'mycase_people'"),
	query('a with query', 'WITH t AS (SELECT 1 AS a) SELECT a FROM t'),
	query('a with query without rows', 'WITH t AS (SELECT 1 AS a) SELECT a FROM t WHERE a > 1'),
	query('a query that ends with a semicolon', 'SELECT 1 AS a;'),
	query('line feeds in the query', 'SELECT id\nFROM mycase_people\nWHERE id = 1\n'),
];

const WRITES: MysqlCase[] = [
	query('an insert', "INSERT INTO mycase_log (text) VALUES ('a'), ('b')"),
	query('an update', "UPDATE mycase_people SET note = 'n' WHERE id < 3"),
	query('an update that changes no row', "UPDATE mycase_people SET name = 'Ann' WHERE id = 1"),
	query('a delete', 'DELETE FROM mycase_people WHERE id = 2'),
	query('a create and a drop', 'CREATE TABLE mycase_made (a INT); DROP TABLE mycase_made'),
	query('a truncate', 'TRUNCATE TABLE mycase_log'),
	query('an insert that is ignored', "INSERT IGNORE INTO mycase_log (text) VALUES ('start')"),
	query('an insert, detailed', "INSERT INTO mycase_log (text) VALUES ('a'), ('b')", {
		detailedOutput: true,
	}),
	query('an update, detailed', "UPDATE mycase_people SET name = 'Ann' WHERE id < 3", {
		detailedOutput: true,
	}),
	query('rows, detailed', 'SELECT id, name FROM mycase_people ORDER BY id', {
		detailedOutput: true,
	}),
	query('no rows, detailed', 'SELECT id FROM mycase_people WHERE id > 100', {
		detailedOutput: true,
	}),
	query(
		'several commands, detailed',
		"SELECT 1 AS a; UPDATE mycase_people SET age = 1 WHERE id = 3; INSERT INTO mycase_log (text) VALUES ('w'); SELECT 2 AS b",
		{ detailedOutput: true },
	),
	query('detailed output off', 'SELECT id FROM mycase_people ORDER BY id', {
		detailedOutput: false,
	}),
];

const ITEMS: MysqlCase[] = [
	query(
		'a part of the text for each item',
		'SELECT name FROM mycase_people WHERE id = {{ $json.id }}',
		{},
		{ items: PEOPLE },
	),
	query(
		'a write for each item',
		"INSERT INTO mycase_log (text) VALUES ('{{ $json.name }}')",
		{},
		{ items: PEOPLE },
	),
	query(
		'a write for each item, detailed',
		"INSERT INTO mycase_log (text) VALUES ('{{ $json.name }}');",
		{ detailedOutput: true },
		{ items: PEOPLE },
	),
	query(
		'a part with the patterns of a replacement',
		"SELECT '{{ $json.a }}' AS a, '{{ $json.b }}' AS b",
		{},
		{ items: [{ a: '$&-$$', b: 'x$`y' }] },
	),
	query(
		'a number and a list as parts',
		'SELECT {{ $json.n }} AS n, {{ $json.list }} AS a',
		{},
		{
			items: [{ n: 1.5, list: [7] }],
		},
	),
	query(
		'a part that is null',
		'SELECT {{ $json.none }} AS n',
		{},
		{ items: [{ none: null }], host: true },
	),
	query(
		'a query that is an expression',
		'=SELECT name FROM mycase_people WHERE id = {{ $json.id }}',
		{},
		{
			items: PEOPLE,
		},
	),
];

const PARAMETERS: MysqlCase[] = [
	query('parameters as text', 'SELECT $1 AS a, $2 AS b, $3 AS c', {
		queryReplacement: '1, Ann , 007',
	}),
	query('parameters as text with an empty entry', 'SELECT $1 AS a, $2 AS b, $3 AS c', {
		queryReplacement: 'x,,y',
	}),
	query(
		'parameters from an expression',
		'SELECT name, $2 AS word FROM mycase_people WHERE id = $1',
		{ queryReplacement: '={{ $json.id }}, {{ $json.word }}' },
		{ items: PEOPLE },
	),
	query(
		'one parameter that is text',
		'SELECT name FROM mycase_people WHERE name = $1',
		{ queryReplacement: '={{ $json.name }}' },
		{ items: PEOPLE },
	),
	query(
		'one parameter that is a number',
		'SELECT name FROM mycase_people WHERE id = $1',
		{ queryReplacement: '={{ $json.id }}' },
		{ items: PEOPLE },
	),
	query(
		'a list of parameters',
		'SELECT name, $2 AS word, $3 AS flag, $4 AS none, $5 AS n FROM mycase_people WHERE id = $1',
		{ queryReplacement: '={{ [$json.id, $json.word, true, null, 1.5] }}' },
		{ items: PEOPLE },
	),
	query('a list in a list for IN', 'SELECT name FROM mycase_people WHERE id IN ($1) ORDER BY id', {
		queryReplacement: '={{ [[1, 3]] }}',
	}),
	query('an object for SET', 'UPDATE mycase_people SET $1 WHERE id = $2', {
		queryReplacement: '={{ [{ note: "o\'k", age: 9 }, 1] }}',
	}),
	query('an object where no SET is', 'SELECT $1 AS a', {
		queryReplacement: '={{ [{ note: 1 }] }}',
	}),
	query('a name parameter', 'SELECT $2:name FROM $1:name WHERE id = $3', {
		queryReplacement: 'mycase_people, name, 2',
	}),
	query(
		'a name parameter with a dot and a backtick',
		'SELECT $1:name AS a FROM mycase_people p WHERE id = 1',
		{ queryReplacement: '={{ ["p.`name`"] }}' },
	),
	query('a name parameter that is null', 'SELECT $1:name FROM mycase_people', {
		queryReplacement: '={{ [null] }}',
	}),
	query('a parameter in a string', "SELECT '$1' AS a, $1 AS b", { queryReplacement: 'x' }),
	query('a parameter without a value', 'SELECT $1 AS a, $2 AS b', { queryReplacement: 'x' }),
	query('a place and no parameters', 'SELECT $1 AS a'),
	query('a place and empty parameters', 'SELECT $1 AS a', { queryReplacement: '' }),
	query('ten parameters', 'SELECT $10 AS j, $1 AS a', {
		queryReplacement: 'a,b,c,d,e,f,g,h,i,j',
	}),
	query('the places out of order', 'SELECT $2 AS b, $1 AS a', {
		queryReplacement: 'first, second',
	}),
	query('a question mark of the query', 'SELECT ? AS a, $1 AS b', { queryReplacement: 'x' }),
	query('texts that are numbers', 'SELECT $1 AS a, $2 AS b, $3 AS c, $4 AS d, $5 AS e', {
		queryReplacement: '0x10, 1e2, -5, 0, 12px',
	}),
	query(
		'text with marks',
		'SELECT $1 AS a, $2 AS b, $3 AS c',
		{ queryReplacement: '={{ [$json.a, $json.b, $json.c] }}' },
		{ items: [{ a: 'it\'s "x" \\ %_', b: 'line\nfeed\ttab', c: 'é 😀 ?' }] },
	),
	query(
		'text and an expression in one entry',
		'SELECT $1 AS a, $2 AS b',
		{ queryReplacement: '=a{{ $json.id }}b, {{ $json.id }}{{ $json.name }}' },
		{ items: PEOPLE },
	),
	query(
		'a list as one of two entries',
		'SELECT $1 AS a, $2 AS b',
		{ queryReplacement: '={{ $json.list }}, x' },
		{ items: [{ list: [1, 2] }] },
	),
	query(
		'a comma in an expression',
		'SELECT $1 AS a, $2 AS b',
		{ queryReplacement: '={{ [$json.id, 5].join("-") }}, x' },
		{ items: [{ id: 1 }] },
	),
	query('parameters that are a number, not text', 'SELECT $1 AS a', {
		queryReplacement: '={{ 5 }}',
	}),
];

const ERRORS: MysqlCase[] = [
	query('a syntax error', 'SELEC 1'),
	query('a syntax error on the second line', 'SELECT 1\nFROM mycase_people\nWHERE id == 1'),
	query(
		'a syntax error in the second command',
		"INSERT INTO mycase_log (text) VALUES ('kept'); SELEC 2",
	),
	query('a table that is not there', 'SELECT * FROM mycase_nope'),
	query(
		'a key that is there',
		"INSERT INTO mycase_log (text) VALUES ('new'); INSERT INTO mycase_log (text) VALUES ('start')",
	),
	query('an empty query', ''),
	query('a query of blanks', '  '),
	query(
		'a syntax error in the query of the second item',
		'{{ $json.q }}',
		{},
		{ items: [{ q: 'SELECT 1 AS a' }, { q: 'SELECT 2 AS b FRO mycase_people' }] },
	),
	query(
		'a failure in the query of the second item',
		"INSERT INTO mycase_log (text) VALUES ('{{ $json.t }}')",
		{},
		{ items: [{ t: 'one' }, { t: 'start' }, { t: 'three' }] },
	),
	query('a port that is closed', 'SELECT 1', {}, { credential: { port: 5999 } }),
	query('a wrong password', 'SELECT 1', {}, { credential: { password: 'wrong' } }),
	query(
		'a database that is not there',
		'SELECT 1',
		{},
		{ credential: { database: 'mycase_nope' } },
	),
	query(
		'a parameter error before a connection error',
		'SELECT $2',
		{ queryReplacement: 'x' },
		{
			credential: { port: 5999 },
		},
	),
];

const MODES: MysqlCase[] = BATCHING.flatMap((queryBatching) => [
	query(
		`${queryBatching}, rows for each item`,
		'SELECT name FROM mycase_people WHERE id = {{ $json.id }}',
		{ queryBatching },
		{ items: PEOPLE },
	),
	query(
		`${queryBatching}, two statements for each item`,
		"INSERT INTO mycase_log (text) VALUES ('{{ $json.name }}'); SELECT COUNT(*) AS n FROM mycase_log;",
		{ queryBatching },
		{ items: PEOPLE },
	),
	query(
		`${queryBatching}, detailed`,
		"INSERT INTO mycase_log (text) VALUES ('{{ $json.name }}'); SELECT COUNT(*) AS n FROM mycase_log",
		{ queryBatching, detailedOutput: true },
		{ items: PEOPLE },
	),
	query(`${queryBatching}, an empty statement, detailed`, 'SELECT 1 AS a;; SELECT 2 AS b', {
		queryBatching,
		detailedOutput: true,
	}),
	query(
		`${queryBatching}, no rows`,
		'SELECT id FROM mycase_people WHERE id > 100',
		{ queryBatching },
		{ items: PEOPLE },
	),
	query(
		`${queryBatching}, a write`,
		"UPDATE mycase_people SET note = 'n' WHERE id = {{ $json.id }}",
		{ queryBatching },
		{ items: PEOPLE },
	),
	query(
		`${queryBatching}, a failure in the second item`,
		"INSERT INTO mycase_log (text) VALUES ('{{ $json.t }}')",
		{ queryBatching },
		{ items: [{ t: 'one' }, { t: 'start' }, { t: 'three' }] },
	),
	query(
		`${queryBatching}, a failure in the second statement`,
		"INSERT INTO mycase_log (text) VALUES ('one'); INSERT INTO mycase_log (text) VALUES ('start'); INSERT INTO mycase_log (text) VALUES ('three')",
		{ queryBatching },
	),
	query(`${queryBatching}, a syntax error in the first item`, 'SELECT 1\nFRO mycase_people', {
		queryBatching,
	}),
	query(
		`${queryBatching}, a syntax error in the second item`,
		'{{ $json.q }}',
		{ queryBatching },
		{
			items: [
				{ q: "INSERT INTO mycase_log (text) VALUES ('one')" },
				{ q: 'SELECT 2 AS b FRO mycase_people' },
			],
		},
	),
	query(`${queryBatching}, a variable of the session`, 'SET @v = 41; SELECT @v + 1 AS v', {
		queryBatching,
	}),
	query(`${queryBatching}, a semicolon in a string`, "SELECT 'a;b' AS a; SELECT 2 AS b", {
		queryBatching,
	}),
	query(
		`${queryBatching}, a wrong password`,
		'SELECT 1',
		{ queryBatching },
		{ credential: { password: 'wrong' } },
	),
	query(`${queryBatching}, an empty query`, '', { queryBatching }, { host: true }),
	query(
		`${queryBatching}, a create in the middle`,
		"INSERT INTO mycase_log (text) VALUES ('one'); CREATE TABLE mycase_made (a INT); INSERT INTO mycase_log (text) VALUES ('start')",
		{ queryBatching },
	),
]);

function versioned(typeVersion: number): MysqlCase[] {
	const at = (c: MysqlCase): MysqlCase => ({
		...c,
		name: `version ${typeVersion}, ${c.name}`,
		typeVersion,
	});
	return [
		at(query('rows', 'SELECT id, name FROM mycase_people ORDER BY id')),
		at(query('no rows', 'SELECT id FROM mycase_people WHERE id > 100')),
		at(query('a write', "INSERT INTO mycase_log (text) VALUES ('a')")),
		at(query('a semicolon in a string', "SELECT 'a;b' AS a")),
		at(
			query('a semicolon in a string, detailed', "SELECT 'a;b' AS a; SELECT 2 AS b", {
				detailedOutput: true,
			}),
		),
		at(
			query('parameters', 'SELECT $1 AS a, $2 AS b, $3:name FROM mycase_people WHERE id = 1', {
				queryReplacement: '007, x, name',
			}),
		),
		at(query('a parameter in a string', "SELECT '$1' AS a, $1 AS b", { queryReplacement: 'x' })),
		at(
			query('independently, a semicolon in a string', "SELECT 'a;b' AS a", {
				queryBatching: 'independently',
			}),
		),
		at(
			query(
				'transaction, two statements',
				"INSERT INTO mycase_log (text) VALUES ('a'); SELECT COUNT(*) AS n FROM mycase_log",
				{ queryBatching: 'transaction' },
			),
		),
		at(
			query('independently, no rows', 'SELECT id FROM mycase_people WHERE id > 100', {
				queryBatching: 'independently',
			}),
		),
		at(query('a syntax error', 'SELEC 1')),
	];
}

const VERSIONS: MysqlCase[] = [
	...versioned(2),
	...versioned(2.1),
	...versioned(2.2),
	...versioned(2.3),
	...versioned(2.4),
	{
		...query('a date column', 'SELECT born FROM mycase_types WHERE id = 1'),
		name: 'version 2, a date column',
		typeVersion: 2,
		host: true,
	},
	{
		...query('a parameter without a value', 'SELECT $2 AS a', { queryReplacement: 'x' }),
		name: 'version 2.4, a parameter without a value',
		typeVersion: 2.4,
		host: true,
	},
];

const HOST: MysqlCase[] = [
	query('a call of a procedure', 'CALL mycase_two()', {}, { host: true }),
	query(
		'two commands that v1 reads as one',
		"SELECT 1 AS a; SELECT 2 AS b -- it's",
		{},
		{ host: true },
	),
	query('a geometry column', "SELECT ST_GeomFromText('POINT(1 2)') AS g", {}, { host: true }),
	query(
		'empty strings as null, with an expression',
		'SELECT {{ $json.id }} AS a',
		{ replaceEmptyStrings: true },
		{ convertHost: true },
	),
	query(
		'a continue setting',
		'SELECT 1 AS a',
		{},
		{ convertHost: true, onError: 'continueRegularOutput' },
	),
	query(
		'an error output',
		'SELECT 1 AS a',
		{},
		{ convertHost: true, onError: 'continueErrorOutput' },
	),
	{
		name: 'select, not in the library node',
		typeVersion: 2.5,
		parameters: {
			operation: 'select',
			table: { __rl: true, mode: 'list', value: 'mycase_people' },
			options: {},
		},
		convertHost: true,
	},
];

export const MYSQL_CASES: MysqlCase[] = [
	...READS,
	...WRITES,
	...ITEMS,
	...PARAMETERS,
	...ERRORS,
	...MODES,
	...VERSIONS,
	...HOST,
	query('empty strings as null, without an expression', 'SELECT 1 AS a', {
		replaceEmptyStrings: true,
	}),
];
