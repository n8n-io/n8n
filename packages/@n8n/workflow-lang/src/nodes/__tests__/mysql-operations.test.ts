/**
 * The statements and the error items of the MySQL library node for the operations and the
 * error settings that have no recording yet, without a database. A made-up answer of the
 * `sql` effect stands for the database. The expected texts are written by hand from the
 * source of the v1 node. The equivalence with v1 is the task of
 * `mysql-equivalence.shared.ts`.
 */
import { compile } from '../../compiler/index.ts';
import { decodeModule } from '../../compiler/decode.ts';
import { convertWorkflow } from '../../convert/index.ts';
import type { Fixture } from '../../reference/runner.ts';
import { runReference } from '../../reference/runner.ts';
import { runModule } from '../../testing/vm.ts';
import type { MysqlCase } from './mysql-cases.ts';
import { MYSQL_CONTINUE_CASES } from './mysql-continue-cases.ts';
import { MYSQL_OPERATION_CASES } from './mysql-operation-cases.ts';

const NODE = 'Node';
const HOST_NODE = 'Node (fallback host)';
const CASES = [...MYSQL_OPERATION_CASES, ...MYSQL_CONTINUE_CASES];

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function workflowOf(c: MysqlCase) {
	return {
		name: 'MySQL',
		nodes: [
			{
				name: 'Hook',
				type: 'n8n-nodes-base.webhook',
				typeVersion: 2,
				position: [0, 0],
				parameters: { path: 'p', httpMethod: 'POST' },
			},
			{
				name: 'Split',
				type: 'n8n-nodes-base.splitOut',
				typeVersion: 1,
				position: [200, 0],
				parameters: { fieldToSplitOut: 'body.rows', options: {} },
			},
			{
				id: 'step',
				name: NODE,
				type: 'n8n-nodes-base.mySql',
				typeVersion: c.typeVersion,
				position: [200, 0],
				parameters: c.parameters,
				credentials: { mySql: { id: 'case', name: 'case' } },
				...(c.onError ? { onError: c.onError } : {}),
				...c.settings,
			},
		],
		connections: {
			Hook: { main: [[{ node: 'Split', type: 'main', index: 0 }]] },
			Split: { main: [[{ node: NODE, type: 'main', index: 0 }]] },
		},
	};
}

const OK = {
	command: 'OK',
	rowCount: 1,
	rows: [],
	ok: { affectedRows: 1, insertId: 0, info: '', serverStatus: 2, warningStatus: 0 },
};
const FAILURE = {
	message: "Unknown column 'nope' in 'field list'",
	code: 'ER_BAD_FIELD_ERROR',
	errno: 1054,
	sqlState: '42S22',
	sqlMessage: "Unknown column 'nope' in 'field list'",
};

/** A made-up database: a text with `nope` fails, a select gives one row, and the rest is OK. */
function answerOf(args: unknown): unknown {
	if (!isRecord(args) || !Array.isArray(args.statements)) return { results: [] };
	const results: unknown[] = [];
	const failedGroups: unknown[] = [];
	for (const statement of args.statements) {
		const text = isRecord(statement) ? String(statement.text) : '';
		const group = isRecord(statement) ? statement.group : undefined;
		if (group !== undefined && failedGroups.includes(group)) {
			results.push({ skipped: true });
			continue;
		}
		if (text.includes('nope')) {
			results.push({ error: FAILURE });
			if (args.mode === 'independently') failedGroups.push(group);
			else break;
			continue;
		}
		const select = text.startsWith('SELECT');
		results.push({ sets: [select ? { command: 'SELECT', rowCount: 1, rows: [{ id: 1 }] } : OK] });
	}
	return { results };
}

interface Ran {
	statements: string[];
	groups: unknown[];
	output?: unknown;
	error?: string;
	host: boolean;
}

async function run(c: MysqlCase): Promise<Ran> {
	const converted = convertWorkflow(workflowOf(c), {
		mysql: true,
		mysqlRecordFirst: true,
		trace: 'all',
	});
	expect(converted.ok).toBe(true);
	const compiled = compile(converted.source);
	expect(compiled.diagnostics).toEqual([]);
	const fixture = (effects: Record<string, unknown[]>): Fixture => ({
		trigger: { body: { rows: c.items ?? [{}] }, headers: {}, query: {} },
		now: 0,
		seed: 1,
		effects,
		trace: true,
	});
	const answers: unknown[] = [];
	const reference = await runReference(converted.source, fixture({}), {
		answer: async (effect) => {
			if (effect.kind === 'sql') {
				const answer = answerOf(effect.args);
				answers.push(answer);
				return JSON.parse(JSON.stringify(answer));
			}
			if (effect.kind === 'node' && effect.step === HOST_NODE) return [];
			return undefined;
		},
	});
	// The bytecode VM gives the same run on the same answers.
	const replay = fixture({ [NODE]: answers, [HOST_NODE]: [[]] });
	const again = await runReference(converted.source, replay);
	const bytecode = runModule(decodeModule(compiled.module ?? new Uint8Array()), replay);
	expect(JSON.stringify(bytecode)).toBe(JSON.stringify(again));

	const statements: string[] = [];
	const groups: unknown[] = [];
	for (const effect of reference.effects) {
		if (effect.kind !== 'sql' || !isRecord(effect.args)) continue;
		expect(effect.args.dialect).toBe('mysql');
		const list = Array.isArray(effect.args.statements) ? effect.args.statements : [];
		for (const statement of list) {
			if (!isRecord(statement)) continue;
			expect(statement.simple).toBe(true);
			expect('values' in statement).toBe(false);
			statements.push(String(statement.text));
			groups.push(statement.group);
		}
	}
	const host = reference.effects.some((e) => e.kind === 'node' && e.step === HOST_NODE);
	if (reference.status !== 'ok') {
		const result = reference.result;
		return { statements, groups, host, error: isRecord(result) ? String(result.message) : '' };
	}
	const traced = [...(reference.trace ?? [])]
		.reverse()
		.find((t) => t.step === NODE && Array.isArray(t.items));
	return { statements, groups, host, output: traced?.items };
}

function named(name: string): MysqlCase {
	const found = CASES.find((c) => c.name === name);
	if (found === undefined) throw new Error(`No case "${name}"`);
	return found;
}

const TEXTS: Array<[string, string[]]> = [
	['select, the first rows', ['SELECT * FROM `mycase_people` LIMIT 50']],
	['select, all rows', ['SELECT * FROM `mycase_people`']],
	['select, two columns', ['SELECT `id`, `name` FROM `mycase_people`']],
	['select, a star and a column', ['SELECT * FROM `mycase_people`']],
	['select, no column', ['SELECT  FROM `mycase_people`']],
	['select, distinct', ['SELECT DISTINCT `label` FROM `mycase_types`']],
	[
		'select, greater than a number in a text',
		['SELECT * FROM `mycase_people` WHERE `age` > 40 LIMIT 50'],
	],
	[
		'select, greater than an empty text',
		['SELECT * FROM `mycase_people` WHERE `age` >= 0 LIMIT 50'],
	],
	[
		'select, is not null, and a second clause',
		['SELECT * FROM `mycase_people` WHERE `note` IS NOT NULL  AND `id` < 3 LIMIT 50'],
	],
	[
		'select, two clauses with or',
		["SELECT * FROM `mycase_people` WHERE `name` = 'Ann' OR `age` IS NULL  LIMIT 50"],
	],
	[
		'select, a value with an apostrophe, a semicolon and a backslash',
		["SELECT * FROM `mycase_people` WHERE `note` = 'it\\'s; a \\\\ note' LIMIT 50"],
	],
	[
		'select, a value that is a list',
		["SELECT * FROM `mycase_people` WHERE `id` = 2 AND `name` != 3 LIMIT 'x'"],
	],
	['select, a value that is null', ['SELECT * FROM `mycase_people` WHERE `age` = NULL LIMIT 50']],
	['select, sorted', ['SELECT * FROM `mycase_people` ORDER BY `age` DESC, `name` ASC']],
	[
		'select, a clause, a sort rule and a limit',
		['SELECT * FROM `mycase_people` WHERE `id` > 1 ORDER BY `id` DESC LIMIT 1'],
	],
	['select, a table name with a backtick', ['SELECT * FROM `mycase`.`people` LIMIT 50']],
	[
		'select, a row for each item, single',
		[
			'SELECT * FROM `mycase_people` WHERE `id` = 1 LIMIT 50;SELECT * FROM `mycase_people` WHERE `id` = 2 LIMIT 50;SELECT * FROM `mycase_people` WHERE `id` = 3 LIMIT 50',
		],
	],
	[
		'select, a row for each item, transaction',
		[
			'SELECT * FROM `mycase_people` WHERE `id` = 1 LIMIT 50',
			'SELECT * FROM `mycase_people` WHERE `id` = 2 LIMIT 50',
			'SELECT * FROM `mycase_people` WHERE `id` = 3 LIMIT 50',
		],
	],
	[
		'select, a value with a semicolon in version 2.3',
		["SELECT * FROM `mycase_people` WHERE `note` = 'a", "b' LIMIT 50"],
	],
	[
		'insert, the input items, single',
		[
			"INSERT   INTO `mycase_people` (`name`, `age`, `note`) VALUES ('Dora',5,NULL),('O\\'Neil; x',NULL,'a\\\\b \\\"q\\\" \\n é 😀'),(NULL,NULL,'')",
		],
	],
	[
		'insert, values of the node, independently',
		[
			"INSERT   INTO `mycase_people` (`name`, `age`) VALUES ('Dora',7)",
			"INSERT   INTO `mycase_people` (`name`, `age`) VALUES ('O\\'Neil; x',7)",
			'INSERT   INTO `mycase_people` (`name`, `age`) VALUES (NULL,7)',
		],
	],
	[
		'insert, high priority and skipped',
		["INSERT HIGH_PRIORITY IGNORE INTO `mycase_log` (`text`) VALUES ('start')"],
	],
	[
		'insert, empty strings as null, single',
		["INSERT   INTO `mycase_people` (`name`, `note`) VALUES (NULL,NULL),('x',NULL)"],
	],
	[
		'insert, values of each type',
		[
			"INSERT   INTO `mycase_people` (`name`, `age`, `note`) VALUES (true,'12','[object Object]'),(1.5,NULL,1, 'a', NULL)",
		],
	],
	['insert, an item without a field', ['INSERT   INTO `mycase_people` () VALUES ()']],
	[
		'insert, a column name with a dot and a backtick',
		['INSERT   INTO `mycase_people` (`a`.`b`, `c`.`d`) VALUES (1,2)'],
	],
	[
		'insert, two values for one column',
		["INSERT   INTO `mycase_people` (`name`, `age`) VALUES ('second',1)"],
	],
	[
		'insert, items with other columns in one query',
		["INSERT   INTO `mycase_people` (`name`, `note`) VALUES ('v','v'),(?,?)"],
	],
	[
		'update, the input items, single',
		[
			"UPDATE `mycase_people` SET `name` = 'Ann\\'s', `note` = NULL WHERE `id` = 1;UPDATE `mycase_people` SET `age` = 46 WHERE `id` = 2;UPDATE `mycase_people` SET `name` = 'none' WHERE `id` = 99",
		],
	],
	[
		'update, values of the node, transaction',
		[
			"UPDATE `mycase_people` SET `note` = 'x;y', `age` = 1 WHERE `name` = 'Ann'",
			"UPDATE `mycase_people` SET `note` = NULL, `age` = 1 WHERE `name` = 'Cy'",
		],
	],
	['update, only the column to match on', ['UPDATE `mycase_people` SET  WHERE `id` = 1']],
	[
		'update, an item without the column to match on',
		["UPDATE `mycase_people` SET `name` = 'x' WHERE `id` = NULL"],
	],
	[
		'update, a value that is an object',
		["UPDATE `mycase_people` SET `note` = '[object Object]' WHERE `id` = 1"],
	],
	[
		'update, the value to match on comes first in the values',
		["UPDATE `mycase_people` SET `name` = 'B' WHERE `id` = 2"],
	],
	[
		'upsert, the input items, independently',
		[
			"INSERT INTO `mycase_people`(`id`, `name`) VALUES(1,'Ann\\'s') ON DUPLICATE KEY UPDATE `name` = 'Ann\\'s'",
			"INSERT INTO `mycase_people`(`id`, `name`, `age`) VALUES(9,'New',3) ON DUPLICATE KEY UPDATE `name` = 'New', `age` = 3",
			"INSERT INTO `mycase_people`(`id`, `name`) VALUES(2,'Bob') ON DUPLICATE KEY UPDATE `name` = 'Bob'",
		],
	],
	[
		'upsert, values of the node, single',
		[
			"INSERT INTO `mycase_log`(`id`, `text`) VALUES(20,'start') ON DUPLICATE KEY UPDATE `id` = 20;INSERT INTO `mycase_log`(`id`, `text`) VALUES(21,'more') ON DUPLICATE KEY UPDATE `id` = 21",
		],
	],
	[
		'upsert, the value to match on replaces a value of the node',
		[
			"INSERT INTO `mycase_people`(`id`, `name`) VALUES(3,'C') ON DUPLICATE KEY UPDATE `name` = 'C'",
		],
	],
	[
		'deleteTable, truncate, without a command in the parameters',
		['TRUNCATE TABLE `mycase_people`'],
	],
	['deleteTable, drop', ['DROP TABLE IF EXISTS `mycase_log`']],
	['deleteTable, delete all rows', ['DELETE FROM `mycase_people`']],
	[
		'deleteTable, delete some rows',
		['DELETE FROM `mycase_people` WHERE `id` > 1 AND `note` IS NULL '],
	],
];

const FAILURES: Array<[string, string]> = [
	[
		'select, a comparison with a text that is not a number',
		"Operator in entry 1 of 'Select Rows' works with numbers, but value old is not a number",
	],
	['select, a condition that is not valid', 'Invalid where clause'],
	[
		'deleteTable, a command that is not valid',
		'Invalid delete command, only drop, delete and truncate are supported ',
	],
	['select, a failure of the second item, transaction', "Unknown column 'nope' in 'field list'"],
];

describe('MySQL library node, operations without a recording', () => {
	it.each(TEXTS)('%s: the statements of v1', async (name, texts) => {
		const ran = await run(named(name));
		expect(ran.error).toBeUndefined();
		expect(ran.host).toBe(false);
		expect(ran.statements).toEqual(texts);
	});

	it.each(FAILURES)('%s: the error of v1', async (name, message) => {
		const ran = await run(named(name));
		expect(ran.host).toBe(false);
		expect(ran.error).toContain(message);
	});

	it.each(CASES.filter((c) => c.host === true).map((c) => c.name))(
		'%s: goes to the fallback host before a statement',
		async (name) => {
			const ran = await run(named(name));
			expect(ran.host).toBe(true);
			expect(ran.statements).toEqual([]);
		},
	);

	it('gives the output of v1 for a write and for rows', async () => {
		const write = await run(named('update, a row that does not change'));
		expect(write.output).toEqual([{ success: true }]);
		const detailed = await run(named('deleteTable, truncate, detailed'));
		expect(detailed.output).toEqual([
			{
				sql: 'TRUNCATE TABLE `mycase_people`',
				data: {
					fieldCount: 0,
					affectedRows: 1,
					insertId: 0,
					info: '',
					serverStatus: 2,
					warningStatus: 0,
					changedRows: 0,
				},
			},
		]);
		const rows = await run(named('select, a row for each item, independently'));
		expect(rows.output).toEqual([{ id: 1 }, { id: 1 }, { id: 1 }]);
		expect(rows.groups).toEqual([0, 0, 0]);
	});

	it('makes the error items of v1 for an item that fails before its query', async () => {
		const item = (a: number) => ({
			message: 'Invalid where clause',
			item: { a },
			itemIndex: a - 1,
		});
		const regular = await run(named('continue, select, a where clause that is not valid'));
		expect(regular.statements).toEqual([]);
		expect(regular.output).toEqual([item(1), item(2), item(3)]);
		const errors = await run(named('error output, select, a where clause that is not valid'));
		expect(errors.statements).toEqual([]);
		expect(errors.output).toEqual([
			[],
			[
				{ a: 1, ...item(1) },
				{ a: 2, ...item(2) },
				{ a: 3, ...item(3) },
			],
		]);
	});

	it('makes the error items of v1 for a query that fails', async () => {
		const failed = {
			message: "Unknown column 'nope' in 'field list'",
			item: { query: 'SELECT nope FROM mycase_people LIMIT 1', values: [], itemIndex: 1 },
			itemIndex: 1,
		};
		const each = await run(
			named('continue, executeQuery, a failure of the second query, independently'),
		);
		expect(each.groups).toEqual([0, 1, 2]);
		expect(each.output).toEqual([{ id: 1 }, failed, { id: 1 }]);
		const transaction = await run(
			named('error output, executeQuery, a failure of the second query, transaction'),
		);
		expect(transaction.output).toEqual([[{ id: 1 }], [{ a: 2, ...failed }]]);
		const single = await run(
			named('continue, executeQuery, a failure of the second query, single'),
		);
		expect(single.output).toMatchObject([
			{
				message: "Unknown column 'nope' in 'field list'",
				error: {
					name: 'NodeOperationError',
					description:
						'sql: SELECT id FROM mycase_people LIMIT 1;SELECT nope FROM mycase_people LIMIT 1;SELECT id FROM mycase_people LIMIT 1, code: ER_BAD_FIELD_ERROR',
					context: { itemIndex: 0 },
					messages: [],
				},
			},
		]);
	});

	// Each case takes some seconds. `MYSQL_ALL_CASES=1` runs all of them, else each eighth one.
	it('converts and compiles the cases, and runs them on a made-up database', async () => {
		const step = process.env.MYSQL_ALL_CASES === '1' ? 1 : 8;
		for (let k = 0; k < CASES.length; k += step) {
			const c = CASES[k];
			if (c.credential !== undefined) continue;
			const ran = await run(c);
			expect({ name: c.name, host: ran.host }).toEqual({ name: c.name, host: c.host === true });
		}
	}, 600_000);
});
