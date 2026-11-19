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
import { describe, expect, it } from 'vitest';

import { useUtc } from '../../../reference/runner.ts';
import { translateCode } from '../translate.ts';

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
