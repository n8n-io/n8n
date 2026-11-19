/**
 * The member shapes of a native Code node that also makes a Date value.
 *
 * A native Code node holds a Date value without the members of a JavaScript Date, so a write,
 * delete or test of a member of a value that can be a Date value needs a proof or a check.
 * The static proof covers the plain shapes; each other shape gets a run-time check that hands
 * the node over to the fallback host for a Date value.
 *
 * The cases are made up.
 */
import { beforeAll, describe, expect, it } from 'vitest';

import { useUtc } from '../../../reference/runner.ts';
import { RUNS_IN_HOST } from '../../helpers.ts';
import { translateCode } from '../translate.ts';
import { nativeCode, runnerCode, startRunner, taskRunnerAvailable } from './runner-oracle.ts';

useUtc();

const PRE =
	'const x = {};\n' +
	'const s = \'{"a":1}\';\n' +
	'const list = [{ k: 1 }];\n' +
	'const fn = (e) => e;\n' +
	'const v = 1;\n' +
	'const i = 0;\n' +
	'const arg = {};\n';

interface Shape {
	name: string;
	/** The statements that write, delete or test the member. */
	body: string;
	mode: 'all' | 'each';
}

const SHAPES: Shape[] = [
	{ name: 'let o = {}', body: 'let o = {}; o.a = 1;', mode: 'all' },
	{ name: 'var o = {}', body: 'var o = {}; o.a = 1;', mode: 'all' },
	{ name: 'const o = {...x}', body: 'const o = { ...x }; o.a = 1;', mode: 'all' },
	{ name: 'Object.assign({}, x)', body: 'const o = Object.assign({}, x); o.a = 1;', mode: 'all' },
	{ name: 'JSON.parse(s)', body: 'const o = JSON.parse(s); o.a = 1;', mode: 'all' },
	{ name: 'const a = []; a[0] = 1', body: 'const a = []; a[0] = 1;', mode: 'all' },
	{ name: 'list.map(fn); a[0].k = 1', body: 'const a = list.map(fn); a[0].k = 1;', mode: 'all' },
	{ name: 'function parameter', body: 'function f(acc) { acc.k = 1; } f(arg);', mode: 'all' },
	{
		name: 'reduce accumulator',
		body: 'const r = items.reduce((acc, x) => { acc[x.k] = x; return acc; }, {});',
		mode: 'all',
	},
	{ name: 'item.json.k', body: 'item.json.k = v;', mode: 'each' },
	{ name: 'items[i].json.k', body: 'items[i].json.k = v;', mode: 'all' },
	{
		name: 'for of item.json.k',
		body: 'for (const item of items) item.json.k = 1;',
		mode: 'all',
	},
	{ name: 'const j = item.json; j.k = 1', body: 'const j = item.json; j.k = 1;', mode: 'each' },
	{ name: 'delete o.k', body: 'const o = {}; delete o.k;', mode: 'all' },
	{ name: "'k' in o", body: "const o = {}; if ('k' in o) o.k = 1;", mode: 'all' },
	{ name: 'o.count++', body: 'const o = {}; o.count++;', mode: 'all' },
	{
		name: 'o.list.push(1); o.k = 1',
		body: 'const o = {}; o.list = []; o.list.push(1); o.k = 1;',
		mode: 'all',
	},
];

/** The Date value that makes the guard run. */
const DATES = 'const now = new Date(0);\nconst dates = [now];\n';

const codeOf = (s: Shape): string =>
	`${DATES}${PRE}${s.body}\nreturn [{ json: { t: dates[0].toISOString() } }];`;

const statusOf = (s: Shape): string => {
	const t = translateCode({
		code: codeOf(s),
		mode: s.mode,
		kind: 'code',
		hasNode: () => false,
		timezone: 'UTC',
		dateValues: true,
	});
	return t.ok ? 'ok' : t.blockers[0].feature;
};

/** The translation of each shape: refused with the first blocker, or `ok`. */
const MEASURED: Record<string, string> = {
	'let o = {}': 'ok',
	'var o = {}': 'ok',
	'const o = {...x}': 'ok',
	'Object.assign({}, x)': 'ok',
	'JSON.parse(s)': 'ok',
	'const a = []; a[0] = 1': 'ok',
	'list.map(fn); a[0].k = 1': 'ok',
	'function parameter': 'ok',
	'reduce accumulator': 'ok',
	'item.json.k': 'ok',
	'items[i].json.k': 'ok',
	'for of item.json.k': 'ok',
	'const j = item.json; j.k = 1': 'ok',
	'delete o.k': 'ok',
	"'k' in o": 'ok',
	'o.count++': 'ok',
	'o.list.push(1); o.k = 1': 'ok',
};

describe('member shapes of a Date value: the proof and the run-time check', () => {
	it.each(SHAPES)('$name', (shape) => {
		expect(statusOf(shape)).toBe(MEASURED[shape.name]);
	});
});

/** The expected form of each shape: a static proof, or a run-time check that can hand over. */
const CLASSIFICATION: Record<string, 'exact' | 'handover'> = {
	'let o = {}': 'exact',
	'var o = {}': 'exact',
	'const o = {...x}': 'exact',
	'Object.assign({}, x)': 'exact',
	'JSON.parse(s)': 'exact',
	'const a = []; a[0] = 1': 'exact',
	'list.map(fn); a[0].k = 1': 'handover',
	'function parameter': 'handover',
	'reduce accumulator': 'exact',
	'item.json.k': 'exact',
	'items[i].json.k': 'exact',
	'for of item.json.k': 'exact',
	'const j = item.json; j.k = 1': 'exact',
	'delete o.k': 'exact',
	"'k' in o": 'exact',
	'o.count++': 'exact',
	'o.list.push(1); o.k = 1': 'exact',
};

const classificationOf = (s: Shape): 'exact' | 'handover' | 'refused' => {
	const t = translateCode({
		code: codeOf(s),
		mode: s.mode,
		kind: 'code',
		hasNode: () => false,
		timezone: 'UTC',
		dateValues: true,
	});
	if (!t.ok) return 'refused';
	return t.translation.handsOver ? 'handover' : 'exact';
};

describe('member shapes of a Date value: the form of each', () => {
	it.each(SHAPES)('$name', (shape) => {
		expect(classificationOf(shape)).toBe(CLASSIFICATION[shape.name]);
	});
});

/** The items of the real task runner: each item has a \`json\` with \`k\` and \`v\`. */
const ITEMS = [
	{ k: 'a', v: 1 },
	{ k: 'b', v: 2 },
];

/** The Date value that makes the guard run, and the field that reads it back. */
const D = 'const now = new Date(0);\nconst dates = [now];\n';
const T = 't: dates[0].toISOString()';

interface OracleShape {
	name: string;
	code: string;
	mode: 'all' | 'each';
}

/** A complete Code node body for each shape, with a plain object for the write. */
const ORACLE_SHAPES: OracleShape[] = [
	{
		name: 'let o = {}',
		mode: 'all',
		code: `${D}let o = {};\no.a = 1;\nreturn [{ json: { a: o.a, ${T} } }];`,
	},
	{
		name: 'var o = {}',
		mode: 'all',
		code: `${D}var o = {};\no.a = 1;\nreturn [{ json: { a: o.a, ${T} } }];`,
	},
	{
		name: 'const o = {...x}',
		mode: 'all',
		code: `${D}const x = {};\nconst o = { ...x };\no.a = 1;\nreturn [{ json: { a: o.a, ${T} } }];`,
	},
	{
		name: 'Object.assign({}, x)',
		mode: 'all',
		code: `${D}const x = {};\nconst o = Object.assign({}, x);\no.a = 1;\nreturn [{ json: { a: o.a, ${T} } }];`,
	},
	{
		name: 'JSON.parse(s)',
		mode: 'all',
		code: `${D}const s = '{"b":2}';\nconst o = JSON.parse(s);\no.a = 1;\nreturn [{ json: { a: o.a, b: o.b, ${T} } }];`,
	},
	{
		name: 'const a = []; a[0] = 1',
		mode: 'all',
		code: `${D}const a = [];\na[0] = 1;\nreturn [{ json: { a: a[0], ${T} } }];`,
	},
	{
		name: 'list.map(fn); a[0].k = 1',
		mode: 'all',
		code: `${D}const list = [{ k: 0 }];\nconst fn = (e) => e;\nconst a = list.map(fn);\na[0].k = 1;\nreturn [{ json: { k: a[0].k, ${T} } }];`,
	},
	{
		name: 'function parameter',
		mode: 'all',
		code: `${D}const arg = {};\nfunction f(acc) { acc.k = 1; }\nf(arg);\nreturn [{ json: { k: arg.k, ${T} } }];`,
	},
	{
		name: 'reduce accumulator',
		mode: 'all',
		code: `${D}const r = items.reduce((acc, x) => { acc[x.json.k] = x.json.v; return acc; }, {});\nreturn [{ json: { ...r, ${T} } }];`,
	},
	{
		name: 'item.json.k',
		mode: 'each',
		code: `${D}const v = 1;\nitem.json.k = v;\nreturn { k: item.json.k, ${T} };`,
	},
	{
		name: 'items[i].json.k',
		mode: 'all',
		code: `${D}const i = 0;\nconst v = 1;\nitems[i].json.k = v;\nreturn [{ json: { k: items[0].json.k, ${T} } }];`,
	},
	{
		name: 'for of item.json.k',
		mode: 'all',
		code: `${D}for (const item of items) item.json.k = 1;\nreturn [{ json: { k: items[0].json.k, ${T} } }];`,
	},
	{
		name: 'const j = item.json; j.k = 1',
		mode: 'each',
		code: `${D}const j = item.json;\nj.k = 1;\nreturn { k: item.json.k, ${T} };`,
	},
	{
		name: 'delete o.k',
		mode: 'all',
		code: `${D}const o = { k: 1, other: 2 };\ndelete o.k;\nreturn [{ json: { ...o, ${T} } }];`,
	},
	{
		name: "'k' in o",
		mode: 'all',
		code: `${D}const o = { k: 1 };\nconst has = 'k' in o;\nreturn [{ json: { has, ${T} } }];`,
	},
	{
		name: 'o.count++',
		mode: 'all',
		code: `${D}const o = { count: 0 };\no.count++;\nreturn [{ json: { count: o.count, ${T} } }];`,
	},
	{
		name: 'o.list.push(1); o.k = 1',
		mode: 'all',
		code: `${D}const o = {};\no.list = [];\no.list.push(1);\no.k = 1;\nreturn [{ json: { k: o.k, len: o.list.length, ${T} } }];`,
	},
];

/** The object of the write is a Date for certain: the node must hand over or be refused. */
const DATE_SHAPES: OracleShape[] = [
	{
		name: 'a write on a Date',
		mode: 'all',
		code: 'const d = new Date(0);\nd.k = 1;\nreturn [{ json: { k: d.k, t: d.getTime() } }];',
	},
	{
		name: 'a write on a Date parameter',
		mode: 'all',
		code: 'function f(d) { d.k = 1; return d.k; }\nconst r = f(new Date(0));\nreturn [{ json: { r, t: new Date(0).getTime() } }];',
	},
];

/** True for the error of a hand-over: the fallback host runs the node. */
const handsOver = (r: { ok: boolean; error?: string }): boolean =>
	!r.ok && typeof r.error === 'string' && r.error.includes(RUNS_IN_HOST);

describe.skipIf(!taskRunnerAvailable())('member shapes against the task runner', () => {
	beforeAll(async () => await startRunner(), 120_000);

	it.each(ORACLE_SHAPES)('$name gives the result of v1', async (shape) => {
		const v1 = await runnerCode(shape.code, shape.mode, ITEMS);
		expect(v1.ok).toBe(true);
		let native: ReturnType<typeof nativeCode>;
		try {
			native = nativeCode(shape.code, shape.mode, ITEMS);
		} catch {
			throw new Error('refused: ' + shape.name);
		}
		expect(native).toEqual(v1);
	}, 60_000);

	it.each(DATE_SHAPES)('$name hands over or is refused, never another result', async (shape) => {
		const v1 = await runnerCode(shape.code, shape.mode, ITEMS);
		expect(v1.ok).toBe(true);
		let native: ReturnType<typeof nativeCode>;
		try {
			native = nativeCode(shape.code, shape.mode, ITEMS);
		} catch {
			return;
		}
		expect(handsOver(native)).toBe(true);
	}, 60_000);
});
