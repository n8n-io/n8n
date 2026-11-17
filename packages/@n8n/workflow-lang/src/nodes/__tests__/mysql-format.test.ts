/**
 * Proof that `src/nodes/shared/mysql-format.ts` gives the text of the v1 MySQL node.
 *
 * 1. A differential test on generated calls against the real code: `format`, `escape` and
 *    `escapeId` of a mysql2 connection with the options of the v1 node (the mysql2 of
 *    nodes-base), and the text functions of the built v1 node. The text or the error
 *    message must be equal. A call that the formatter sends to the fallback host
 *    (`(limit: sql-host)`) is counted, and only a case that the generator marks can go there.
 * 2. The same code compiled to bytecode, in a test node, gives the same result as the
 *    source form for a sample of the calls.
 * 3. Properties with an oracle that is not mysql2: a string is one literal and a name is
 *    one identifier for a MySQL server.
 *
 * Larger runs: `MYSQL_FORMAT_CASES`, `MYSQL_FORMAT_VM_CASES` and `MYSQL_FORMAT_SEED`.
 */
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { compile } from '../../compiler/index.ts';
import { decodeModule } from '../../compiler/decode.ts';
import { runModule } from '../../testing/vm.ts';
import {
	myfAllSelect,
	myfEscape,
	myfEscapeId,
	myfFormat,
	myfIdentifier,
	myfJoin,
	myfNumberOr,
	myfPrepare,
	myfReplaceFirst,
	myfStatements,
	myfString,
} from '../shared/mysql-format.ts';
import { prng } from './pg-format-cases.ts';

type Fn =
	| 'format'
	| 'escape'
	| 'escapeId'
	| 'identifier'
	| 'prepare'
	| 'numberOr'
	| 'statements'
	| 'join'
	| 'allSelect'
	| 'string'
	| 'replaceFirst'
	| 'pipeline';

interface Case {
	fn: Fn;
	/** The text, or the only value of the call. */
	a: unknown;
	/** The values. */
	b: unknown;
	/** The node version. */
	version: number;
	/** The mode `single` of `statements`. */
	flag: boolean;
	/** The formatter can send this case to the fallback host. */
	hostAllowed: boolean;
	/** Each value of the case is JSON data: the case can go through a fixture. */
	json: boolean;
}

interface Mysql2Connection {
	format(sql: string, values: unknown): string;
	escape(value: unknown): string;
	escapeId(value: unknown): string;
}

interface V1Utils {
	escapeSqlIdentifier(identifier: string): string;
	prepareQueryAndReplacements(
		query: string,
		version: number,
		values?: unknown[],
	): { query: string; values: unknown[] };
	splitQueryToStatements(query: string, filterOutEmpty?: boolean): string[];
	prepareOutput(
		response: unknown[],
		options: Record<string, unknown>,
		statements: string[],
		helper: (data: unknown[], options: unknown) => unknown[],
		itemData: unknown,
	): unknown[];
}

const here = dirname(fileURLToPath(import.meta.url));
const nodesBase = join(here, '..', '..', '..', '..', '..', 'nodes-base');
const utilsFile = join(nodesBase, 'dist', 'nodes', 'MySql', 'v2', 'helpers', 'utils.js');
const available = existsSync(utilsFile);
const requireBase = createRequire(join(nodesBase, 'package.json'));

/** A mysql2 connection that is not open: its `format` reads only its configuration. */
function connection(): Mysql2Connection {
	const root = dirname(requireBase.resolve('mysql2/package.json'));
	const requireMysql = createRequire(join(root, 'package.json'));
	const Base = requireMysql('./lib/base/connection.js');
	const Config = requireMysql('./lib/connection_config.js');
	// The options of `createPool` of the v1 node (`transport/index.ts`).
	const config = new Config({
		host: 'localhost',
		multipleStatements: true,
		supportBigNumbers: true,
		decimalNumbers: false,
		dateStrings: true,
	});
	const self = { config, _resolveNamedPlaceholders: Base.prototype._resolveNamedPlaceholders };
	return {
		format: (sql, values) => Base.prototype.format.call(self, sql, values),
		escape: (value) => Base.prototype.escape.call(self, value),
		escapeId: (value) => Base.prototype.escapeId.call(self, value),
	};
}

const CASES = Number(process.env.MYSQL_FORMAT_CASES ?? 120000);
const VM_CASES = Number(process.env.MYSQL_FORMAT_VM_CASES ?? 8000);
const SEED = Number(process.env.MYSQL_FORMAT_SEED ?? 20261117);
const HOST = '(limit: sql-host)';
const VERSIONS = [2, 2.1, 2.2, 2.3, 2.4, 2.5];

const TEXT_PARTS = [
	"'",
	"''",
	'"',
	'`',
	'``',
	'\\',
	"\\'",
	'-- ',
	'--',
	'--\t',
	'/*',
	'*/',
	'/*!',
	'/*+',
	'/**/',
	'?',
	'??',
	'???',
	' ? ',
	'$1',
	'$2',
	'$3',
	'$1:name',
	'$2:name',
	'$10',
	'$0',
	'$99',
	'$',
	':name',
	';',
	';;',
	'; ',
	'\n',
	'\r',
	' ',
	'\t',
	'\f',
	' ',
	' SET ',
	'set',
	'SET\n',
	' KEY UPDATE ',
	'key  update',
	' where ',
	' ON ',
	'into',
	'offset_x',
	',',
	', ',
	'(',
	')',
	'=',
	'a',
	'B',
	'_',
	'7',
	'.',
	'->',
	'$&',
	"$'",
	'$`',
	'$$',
	'é',
	'😀',
	'\ud800',
	'\0',
	'\u001a',
	'select',
	'SELECT 1',
	' Select',
	'UPDATE t ',
	'INSERT INTO t ',
	'{{',
	'}}',
];

function pick<T>(random: () => number, list: T[]): T {
	return list[Math.floor(random() * list.length)];
}

function text(random: () => number, max: number): string {
	let out = '';
	const count = Math.floor(random() * max);
	for (let i = 0; i < count; i++) out += pick(random, TEXT_PARTS);
	return out;
}

const NUMBER_TEXTS = [
	'0',
	'1',
	'-1',
	' 12 ',
	'1e3',
	'0x10',
	'0b11',
	'Infinity',
	'-Infinity',
	'',
	' ',
	'1.5',
	'.5',
	'5.',
	'1_0',
	'12px',
	'00',
	'-0',
	'+7',
	'NaN',
	'9007199254740993',
	'1e400',
];
const KEYS = [
	'a',
	'b',
	'a.b',
	'x`y',
	'k->j',
	'1',
	'10',
	'2',
	'toString',
	'valueOf',
	'toSqlString',
	'é',
	'',
];

interface Made {
	value: unknown;
	json: boolean;
	host: boolean;
}

function value(random: () => number, depth: number): Made {
	const kind = Math.floor(random() * 20);
	if (kind === 0) return { value: null, json: true, host: false };
	if (kind === 1) return { value: random() < 0.5, json: true, host: false };
	if (kind === 2) return { value: Math.floor(random() * 2000) - 1000, json: true, host: false };
	if (kind === 3)
		return {
			value: (random() - 0.5) * 10 ** Math.floor(random() * 40 - 10),
			json: true,
			host: false,
		};
	if (kind === 4) return { value: pick(random, NUMBER_TEXTS), json: true, host: false };
	if (kind === 5) {
		return {
			value: pick(random, [undefined, NaN, Infinity, -Infinity, -0]),
			json: false,
			host: false,
		};
	}
	if (kind === 6) return { value: 0, json: true, host: false };
	if (kind <= 8 && depth < 3) {
		const list: unknown[] = [];
		let json = true;
		let host = false;
		const count = Math.floor(random() * 4);
		for (let i = 0; i < count; i++) {
			const member = value(random, depth + 1);
			list.push(member.value);
			json = json && member.json;
			host = host || member.host;
		}
		return { value: list, json, host };
	}
	if (kind <= 10 && depth < 3) {
		const record: Record<string, unknown> = {};
		let json = true;
		let host = false;
		const count = Math.floor(random() * 4);
		for (let i = 0; i < count; i++) {
			const key = pick(random, KEYS);
			const member = value(random, depth + 1);
			record[key] = member.value;
			json = json && member.json;
			host = host || member.host || key === 'toString';
		}
		return { value: record, json, host: host || 'toString' in record };
	}
	return { value: text(random, 6), json: true, host: false };
}

function values(random: () => number, max: number): Made {
	const list: unknown[] = [];
	let json = true;
	let host = false;
	const count = Math.floor(random() * max);
	for (let i = 0; i < count; i++) {
		const member = value(random, 0);
		list.push(member.value);
		json = json && member.json;
		host = host || member.host;
	}
	return { value: list, json, host };
}

const FNS: Fn[] = [
	'format',
	'format',
	'format',
	'escape',
	'escapeId',
	'identifier',
	'prepare',
	'prepare',
	'numberOr',
	'statements',
	'statements',
	'join',
	'allSelect',
	'string',
	'replaceFirst',
	'pipeline',
	'pipeline',
];

function makeCase(seed: number): Case {
	const random = prng(seed);
	const fn = pick(random, FNS);
	const version = pick(random, VERSIONS);
	const base = { fn, version, flag: random() < 0.5, b: null as unknown };
	if (fn === 'format') {
		const list = values(random, 5);
		return { ...base, a: text(random, 14), b: list.value, hostAllowed: list.host, json: list.json };
	}
	if (fn === 'prepare' || fn === 'pipeline') {
		const list = values(random, 4);
		// Before version 2.5, a place without a value goes to the host.
		return {
			...base,
			a: text(random, 12),
			b: list.value,
			hostAllowed: list.host || version < 2.5,
			json: list.json,
		};
	}
	if (fn === 'escape' || fn === 'escapeId' || fn === 'numberOr' || fn === 'string') {
		const made = value(random, 0);
		return { ...base, a: made.value, hostAllowed: made.host, json: made.json };
	}
	if (fn === 'join' || fn === 'allSelect') {
		const list: string[] = [];
		const count = 1 + Math.floor(random() * 3);
		for (let i = 0; i < count; i++) list.push(text(random, 8));
		return { ...base, a: list, hostAllowed: false, json: true };
	}
	if (fn === 'replaceFirst') {
		return {
			...base,
			a: text(random, 10),
			b: [pick(random, TEXT_PARTS), text(random, 5)],
			hostAllowed: false,
			json: true,
		};
	}
	return { ...base, a: text(random, 14), hostAllowed: false, json: true };
}

type Outcome = { text: unknown } | { error: string };

function outcome(run: () => unknown): Outcome {
	try {
		return { text: run() };
	} catch (error) {
		return { error: error instanceof Error ? error.message : String(error) };
	}
}

function list(value: unknown): unknown[] {
	return Array.isArray(value) ? value : [];
}

function mine(c: Case): Outcome {
	return outcome(() => {
		const a = typeof c.a === 'string' ? c.a : '';
		if (c.fn === 'format') return myfFormat(a, list(c.b));
		if (c.fn === 'escape') return myfEscape(c.a);
		if (c.fn === 'escapeId') return myfEscapeId(c.a, false);
		if (c.fn === 'identifier') return myfIdentifier(a);
		if (c.fn === 'prepare') return myfPrepare(a, c.version, list(c.b));
		if (c.fn === 'numberOr') return myfNumberOr(c.a);
		if (c.fn === 'statements') return myfStatements(a, c.version, c.flag);
		if (c.fn === 'join') return myfJoin(list(c.a).map(String));
		if (c.fn === 'allSelect') return myfAllSelect(list(c.a).map(String));
		if (c.fn === 'string') return myfString(c.a);
		if (c.fn === 'replaceFirst') {
			const [pattern, replacement] = list(c.b).map(String);
			return myfReplaceFirst(a, pattern, replacement);
		}
		const prepared = myfPrepare(a, c.version, list(c.b));
		const numbers = c.version >= 2.3 ? prepared.values.map(myfNumberOr) : prepared.values;
		return myfFormat(prepared.query, numbers);
	});
}

function theirs(c: Case, mysql: Mysql2Connection, v1: V1Utils): Outcome {
	return outcome(() => {
		const a = typeof c.a === 'string' ? c.a : '';
		if (c.fn === 'format') return mysql.format(a, list(c.b));
		if (c.fn === 'escape') return mysql.escape(c.a);
		if (c.fn === 'escapeId') return mysql.escapeId(c.a);
		if (c.fn === 'identifier') return v1.escapeSqlIdentifier(a);
		if (c.fn === 'prepare') return v1.prepareQueryAndReplacements(a, c.version, list(c.b));
		// `executeQuery.operation.ts` of v1.
		if (c.fn === 'numberOr') return Number(c.a) ? Number(c.a) : c.a;
		if (c.fn === 'statements') {
			// `configureQueryRunner` of v1.
			if (c.version <= 2.3) {
				return c.flag
					? a
							.replace(/\n/g, '')
							.split(';')
							.filter((statement) => statement !== '')
					: a.split(';').map((q) => q.trim());
			}
			return v1.splitQueryToStatements(a, c.flag);
		}
		if (c.fn === 'join') {
			const queries = list(c.a).map(String);
			return queries.length > 1
				? queries.map((query) => query.trim().replace(/;$/, '')).join(';')
				: queries[0];
		}
		if (c.fn === 'allSelect') {
			const out = v1.prepareOutput(
				[],
				{ nodeVersion: 2.4 },
				list(c.a).map(String),
				(data) => data,
				{
					item: 0,
				},
			);
			return out.length === 0;
		}
		if (c.fn === 'string') return String(c.a);
		if (c.fn === 'replaceFirst') {
			const [pattern, replacement] = list(c.b).map(String);
			return a.replace(pattern, replacement);
		}
		const prepared = v1.prepareQueryAndReplacements(a, c.version, list(c.b));
		const numbers =
			c.version >= 2.3
				? prepared.values.map((entry) => (Number(entry) ? Number(entry) : entry))
				: prepared.values;
		return mysql.format(prepared.query, numbers);
	});
}

function isHost(result: Outcome): boolean {
	return 'error' in result && result.error.endsWith(HOST);
}

/** JSON text that keeps undefined, NaN, the infinities and -0 apart. */
function exact(value: unknown): string {
	return JSON.stringify(value, (_key, member: unknown) => {
		if (member === undefined) return '$undefined';
		if (typeof member === 'number') {
			if (Number.isNaN(member)) return '$nan';
			if (!Number.isFinite(member)) return member > 0 ? '$inf' : '$-inf';
			if (Object.is(member, -0)) return '$-0';
		}
		return member;
	});
}

const workflow = `import { webhook, workflow } from '@n8n/workflow-lang';

export default workflow({
	triggers: [webhook({ path: 'x', method: 'POST' })],
	async run(ctx, trigger) {
		return await ctx.node({ name: 'Node', type: 'test.mysqlFormat', typeVersion: 1, parameters: { cases: trigger.body.cases } });
	},
});
`;

/** The formatter as a node holds it: the text between the markers, without `export`. */
function formatterSource(): string {
	const source = readFileSync(join(here, '..', 'shared', 'mysql-format.ts'), 'utf8');
	const begin = source.indexOf('// mysql-format:begin');
	const end = source.indexOf('// mysql-format:end');
	if (begin < 0 || end < 0) throw new Error('mysql-format.ts has no markers');
	return source.slice(begin, end).replace(/^export /gm, '');
}

const testNode = `import { defineNode } from '@n8n/workflow-lang';

${formatterSource()}

function texts(value: any): string[] {
	const out: string[] = [];
	for (const entry of value) out.push(String(entry));
	return out;
}

function call(c: any): any {
	const a = typeof c.a === 'string' ? c.a : '';
	const b = Array.isArray(c.b) ? c.b : [];
	if (c.fn === 'format') return myfFormat(a, b);
	if (c.fn === 'escape') return myfEscape(c.a);
	if (c.fn === 'escapeId') return myfEscapeId(c.a, false);
	if (c.fn === 'identifier') return myfIdentifier(a);
	if (c.fn === 'prepare') return myfPrepare(a, c.version, b);
	if (c.fn === 'numberOr') return myfNumberOr(c.a);
	if (c.fn === 'statements') return myfStatements(a, c.version, c.flag);
	if (c.fn === 'join') return myfJoin(texts(c.a));
	if (c.fn === 'allSelect') return myfAllSelect(texts(c.a));
	if (c.fn === 'string') return myfString(c.a);
	if (c.fn === 'replaceFirst') return myfReplaceFirst(a, String(b[0]), String(b[1]));
	const prepared = myfPrepare(a, c.version, b);
	const numbers: any[] = [];
	for (const entry of prepared.values) numbers.push(c.version >= 2.3 ? myfNumberOr(entry) : entry);
	return myfFormat(prepared.query, numbers);
}

export default defineNode<any>({
	type: 'test.mysqlFormat',
	version: 1,
	async run(ctx, parameters, items, credential) {
		const out: any[] = [];
		for (const c of parameters.cases) {
			try {
				out.push({ text: call(c) });
			} catch (error: any) {
				out.push({ error: error.message });
			}
		}
		return out;
	},
});
`;

describe('the MySQL formatter', () => {
	it('gives the forms that the v1 MySQL node uses', () => {
		expect(myfFormat('SELECT ?, ?, ?, ?, ?, ?', [1, "a'b", null, true, { a: 1 }, [1, 'x']])).toBe(
			"SELECT 1, 'a\\'b', NULL, true, '[object Object]', 1, 'x'",
		);
		expect(myfFormat('UPDATE t SET ? WHERE id = ?', [{ a: 1, b: 'x' }, 5])).toBe(
			"UPDATE t SET `a` = 1, `b` = 'x' WHERE id = 5",
		);
		expect(
			myfFormat("SELECT ?? FROM ?? WHERE a = ? -- ? \n AND b = '?' AND c = ?", [
				'col',
				't.x',
				2,
				3,
			]),
		).toBe("SELECT `col` FROM `t`.`x` WHERE a = 2 -- ? \n AND b = '?' AND c = 3");
		expect(myfFormat('SELECT ? WHERE a IN (?)', ['x', [[1, 2], [3]]])).toBe(
			"SELECT 'x' WHERE a IN ((1, 2), (3))",
		);
		expect(myfIdentifier('db.my table.`a.b`')).toBe('`db`.`my table`.`a.b`');
		expect(myfPrepare("SELECT $2:name FROM t WHERE a = $1 AND b = '$1'", 2.5, ['x', 'c'])).toEqual({
			query: "SELECT `c` FROM t WHERE a = ? AND b = '$1'",
			values: ['x'],
		});
		expect(() => myfPrepare('SELECT $2', 2.5, [1])).toThrow(
			'Parameter $2 referenced in query but no replacement value provided at index 2',
		);
		expect(myfStatements("SELECT ';';\nSELECT 2;", 2.4, true)).toEqual(["SELECT ';'", 'SELECT 2']);
		expect(myfJoin([' SELECT 1; ', 'SELECT 2'])).toBe('SELECT 1;SELECT 2');
		expect(myfAllSelect(['-- x', '/* a */SELECT 1'])).toBe(true);
		expect(myfAllSelect(['SET @a = 1'])).toBe(false);
	});

	it('sends what it cannot prove to the fallback host', () => {
		expect(() => myfFormat('SELECT ?', [{ toString: 'x' }])).toThrow(HOST);
		expect(() => myfPrepare('SELECT $2', 2.4, [1])).toThrow(HOST);
	});

	it('writes a string as one literal and a name as one identifier, for any text', () => {
		const random = prng(SEED);
		// The end of a string of MySQL without the mode NO_BACKSLASH_ESCAPES.
		const stringEnd = (literal: string): number => {
			if (literal[0] !== "'") return -1;
			let i = 1;
			while (i < literal.length) {
				if (literal[i] === '\\') i += 2;
				else if (literal[i] !== "'") i++;
				else if (literal[i + 1] === "'") i += 2;
				else return i + 1;
			}
			return -1;
		};
		const nameEnd = (name: string): number => {
			if (name[0] !== '`') return -1;
			let i = 1;
			while (i < name.length) {
				if (name[i] !== '`') i++;
				else if (name[i + 1] === '`') i += 2;
				else return i + 1;
			}
			return -1;
		};
		for (let n = 0; n < 30000; n++) {
			const made = text(random, 12);
			const literal = myfFormat('?', [made]);
			expect(stringEnd(literal)).toBe(literal.length);
			expect(myfFormat('a = ? AND b', [made])).toBe(`a = ${literal} AND b`);
			const name = myfEscapeId(made, true);
			expect(nameEnd(name)).toBe(name.length);
		}
	}, 600_000);

	it.runIf(available)(
		`gives the text or the error of mysql2 and the v1 node for ${CASES} generated calls`,
		() => {
			const mysql = connection();
			const v1: V1Utils = requireBase(utilsFile);
			const failures: string[] = [];
			const hostReasons: Record<string, number> = {};
			const byFn: Record<string, number> = {};
			let texts = 0;
			let errors = 0;
			let host = 0;
			for (let seed = SEED; seed < SEED + CASES; seed++) {
				const expected = theirs(makeCase(seed), mysql, v1);
				const c = makeCase(seed);
				const actual = mine(c);
				byFn[c.fn] = (byFn[c.fn] ?? 0) + 1;
				if ('error' in actual && isHost(actual)) {
					host++;
					hostReasons[actual.error.replace(/\$\d+/, '$n')] =
						(hostReasons[actual.error.replace(/\$\d+/, '$n')] ?? 0) + 1;
					if (!c.hostAllowed && failures.length < 5) {
						failures.push(`seed ${seed}: ${c.fn} went to the host: ${actual.error}`);
					}
					continue;
				}
				if ('text' in actual) texts++;
				else errors++;
				if (exact(actual) !== exact(expected) && failures.length < 5) {
					failures.push(
						`seed ${seed}: ${c.fn} ${exact([c.a, c.b, c.version, c.flag]).slice(0, 300)} gave ${exact(actual).slice(0, 300)}, v1 gave ${exact(expected).slice(0, 300)}`,
					);
				}
			}
			console.log(
				`differential: ${CASES} cases ${JSON.stringify(byFn)}; ${texts} equal results; ${errors} equal errors; ${host} to the host ${JSON.stringify(hostReasons)}`,
			);
			expect(failures).toEqual([]);
			expect(texts).toBeGreaterThan(CASES / 2);
			expect(errors).toBeGreaterThan(CASES / 100);
			expect(host).toBeLessThan(CASES / 8);
		},
		600_000,
	);

	it(`gives the same result as bytecode for ${VM_CASES} of the calls`, () => {
		const compiled = compile(workflow, { nodes: { 'nodes/mysql-format-test.ts': testNode } });
		expect(compiled.diagnostics).toEqual([]);
		const module = decodeModule(compiled.module ?? new Uint8Array());
		const failures: string[] = [];
		let ran = 0;
		let host = 0;
		const batch = 200;
		let seed = SEED;
		while (ran < VM_CASES) {
			const cases: Case[] = [];
			while (cases.length < batch && ran + cases.length < VM_CASES) {
				const c = makeCase(seed++);
				// A fixture is JSON: it cannot hold undefined, NaN, an infinity or -0.
				if (c.json) cases.push(c);
			}
			const fixture = { trigger: { body: { cases } }, now: 1000, seed: 7, effects: {} };
			const output = runModule(module, fixture, { fuel: 2_000_000_000 });
			expect(output.status).toBe('ok');
			const results: unknown[] = Array.isArray(output.result) ? output.result : [];
			expect(results.length).toBe(cases.length);
			for (let i = 0; i < cases.length; i++) {
				const expected = mine(cases[i]);
				ran++;
				if (isHost(expected)) host++;
				if (JSON.stringify(results[i]) !== JSON.stringify(expected) && failures.length < 5) {
					failures.push(
						`${cases[i].fn} ${JSON.stringify([cases[i].a, cases[i].b]).slice(0, 200)}: bytecode gave ${JSON.stringify(results[i]).slice(0, 300)}, the source gave ${JSON.stringify(expected).slice(0, 300)}`,
					);
				}
			}
		}
		console.log(`bytecode: ${ran} cases equal to the source form (${host} to the host)`);
		expect(failures).toEqual([]);
	}, 600_000);
});
