/**
 * Typed arrays of a Code node: `new Uint8Array(...)`, `length`, a read and a write of one
 * index, and `Array.from`. Each case runs as native code in the bytecode VM and as a Code
 * node in n8n's engine with its real task runner (`runner-oracle.ts`); the results must be
 * the same. Each other use of a typed array must be refused, so the fallback host runs the
 * node. Every case is made up.
 *
 * v1 sends the value of an item as JSON, so a typed array is an object of its bytes by index
 * (`{"0":1,"1":2}`). The native form of the value is that object, and the helpers of
 * `typed-array-helpers.ts` give the rules of a typed array.
 */
import { beforeAll, describe, expect, it } from 'vitest';

import { useUtc } from '../../../reference/runner.ts';
import { RUNS_IN_HOST } from '../../helpers.ts';
import type { CodeMode } from '../translate.ts';
import { translateCode } from '../translate.ts';
import { nativeCode, runnerCode, startRunner, taskRunnerAvailable } from './runner-oracle.ts';

useUtc();

interface Case {
	name: string;
	code: string;
	mode?: CodeMode;
}

const ITEMS = [{ a: 1 }, { a: 2 }];

/** The bound of a native typed array: more values, and a count that fails, run in the host. */
const BOUND = 1048576;
const sizeCase = (count: string) =>
	`const u = new Uint8Array(${count});\nreturn [{ json: { l: u.length } }];`;

/** Cases of the forms that the translation gives natively. */
const CASES: Case[] = [
	{
		name: 'new Uint8Array()',
		code: 'const u = new Uint8Array();\nreturn [{ json: { u, l: u.length } }];',
	},
	{
		name: 'new Uint8Array(0)',
		code: 'const u = new Uint8Array(0);\nreturn [{ json: { u, l: u.length } }];',
	},
	{
		name: 'new Uint8Array(3)',
		code: 'const u = new Uint8Array(3);\nreturn [{ json: { u, l: u.length, f: u[0], x: u[2] } }];',
	},
	{
		name: 'new Uint8Array(2.7)',
		code: 'const u = new Uint8Array(2.7);\nreturn [{ json: { u, l: u.length } }];',
	},
	{
		name: 'new Uint8Array(NaN)',
		code: 'const u = new Uint8Array(NaN);\nreturn [{ json: { u, l: u.length } }];',
	},
	{
		name: 'new Uint8Array(undefined)',
		code: 'const u = new Uint8Array(undefined);\nreturn [{ json: { u, l: u.length } }];',
	},
	{
		name: 'new Uint8Array(true)',
		code: 'const u = new Uint8Array(true);\nreturn [{ json: { u, l: u.length } }];',
	},
	{
		name: 'new Uint8Array(null)',
		code: 'const u = new Uint8Array(null);\nreturn [{ json: { u, l: u.length } }];',
	},
	{
		name: "new Uint8Array('3')",
		code: "const u = new Uint8Array('3');\nreturn [{ json: { u, l: u.length } }];",
	},
	{
		name: "new Uint8Array('abc')",
		code: "const u = new Uint8Array('abc');\nreturn [{ json: { u, l: u.length } }];",
	},
	{ name: 'new Uint8Array(-1)', code: 'const u = new Uint8Array(-1);\nreturn [{ json: { u } }];' },
	{
		name: 'new Uint8Array(list)',
		code: 'const u = new Uint8Array([1, 2, 300, -1, 2.7, -2.9]);\nreturn [{ json: { u, l: u.length } }];',
	},
	{
		name: 'new Uint8Array(list) with values of each kind',
		code: 'const u = new Uint8Array([1, "2", null, undefined, NaN, true, 256, 1e21]);\nreturn [{ json: { u } }];',
	},
	{
		name: 'new Uint8Array([])',
		code: 'const u = new Uint8Array([]);\nreturn [{ json: { u, l: u.length } }];',
	},
	{
		name: 'new Uint8Array of an array-like object',
		code: 'const u = new Uint8Array({ length: 3, 0: 7, 1: 8 });\nreturn [{ json: { u, l: u.length } }];',
	},
	{
		name: 'new Uint8Array of a plain object',
		code: 'const u = new Uint8Array({});\nreturn [{ json: { u, l: u.length } }];',
	},
	{
		name: 'new Uint8Array of a count from an item',
		code: 'const u = new Uint8Array($json.n);\nreturn [{ json: { l: u.length } }];',
	},
	{
		name: 'new Uint8Array of a list from the items',
		code: 'const u = new Uint8Array(items.map((i) => i.json.a));\nreturn [{ json: { u, l: u.length } }];',
	},
	{
		name: 'a copy of a typed array',
		code: 'const u = new Uint8Array([1, 2]);\nconst w = new Uint8Array(u);\nreturn [{ json: { w, l: w.length } }];',
	},
	{
		name: 'a typed array of a Buffer',
		code: 'const b = Buffer.from("hi");\nconst u = new Uint8Array(b);\nreturn [{ json: { u } }];',
	},
	{
		name: 'a read of one index',
		code: 'const u = new Uint8Array([9, 8]);\nreturn [{ json: { a: u[0], b: u[1], c: u[2], d: u[-1], e: u[0.5], t: typeof u[2] } }];',
	},
	{
		name: 'a write of one index',
		code: 'const u = new Uint8Array([1, 2, 3]);\nu[0] = 300;\nu[1] = -1;\nu[2] = "7";\nreturn [{ json: { u } }];',
	},
	{
		name: 'a write outside the length',
		code: 'const u = new Uint8Array([1]);\nu[3] = 4;\nu[-1] = 4;\nu[1.5] = 4;\nreturn [{ json: { u, l: u.length } }];',
	},
	{
		name: 'the value of a write',
		code: 'const u = new Uint8Array(2);\nconst r = (u[0] = 300);\nreturn [{ json: { r, b: u[0] } }];',
	},
	{
		name: 'a write in a loop',
		code: 'const u = new Uint8Array(2);\nfor (const i of items) {\n  u[i.json.a - 1] = i.json.a * 100;\n}\nreturn [{ json: { u } }];',
	},
	{
		name: 'length after a write',
		code: 'const u = new Uint8Array([1]);\nu[3] = 4;\nreturn [{ json: { l: u.length, u } }];',
	},
	{
		name: 'a sum by index and length',
		code: 'const u = new Uint8Array(items.map((i) => i.json.a));\nlet s = 0;\nfor (let k = 0; k < u.length; k++) s += u[k];\nreturn [{ json: { s } }];',
	},
	{
		name: 'Array.from of a typed array',
		code: 'const u = new Uint8Array([1, 2, 3]);\nreturn [{ json: { a: Array.from(u), l: Array.from(u).length } }];',
	},
	{
		name: 'Array.from with a mapper',
		code: 'const u = new Uint8Array([1, 2]);\nreturn [{ json: { a: Array.from(u, (x) => x * 3) } }];',
	},
	{
		name: 'an item that holds a typed array',
		code: 'const u = new Uint8Array([1, 2]);\nreturn [{ json: { a: 1, u } }, { json: { u } }];',
	},
	{
		name: 'a typed array in an object of the result',
		code: 'return items.map((i) => ({ json: { a: i.json.a, u: new Uint8Array([i.json.a, 2]) } }));',
	},
	{
		name: 'each item mode',
		code: 'const u = new Uint8Array([$json.a, 3]);\nu[0] = $json.a + 300;\nreturn { json: { u, l: u.length, b: u[0] } };',
		mode: 'each',
	},
	{
		name: 'a typed array of text code units',
		code: 'const text = "hi";\nconst u = new Uint8Array([text.charCodeAt(0), text.charCodeAt(1)]);\nreturn [{ json: { u } }];',
	},
];

/** Generated counts and lists: each value once as a count and once as one element. */
const VALUES: Array<[string, string]> = [
	['a small count', '2'],
	['a negative count', '-2'],
	['a fraction', '1.5'],
	['a large count', '1000'],
	['a value of each kind', '[0, 1, 127, 128, 255, 256, 257, -255, -256, -257]'],
	['fractions in a list', '[0.5, 1.5, -0.5, -1.5]'],
	[
		'values that are no numbers',
		'[null, undefined, NaN, Infinity, -Infinity, true, false, "x", ""]',
	],
	['a text of digits', '"12"'],
	['a nested list', '[[1], { a: 1 }]'],
];

const GENERATED: Case[] = VALUES.flatMap(([name, value]) => [
	{
		name: `new Uint8Array(${name})`,
		code: `const u = new Uint8Array(${value});\nreturn [{ json: { u, l: u.length } }];`,
	},
	{
		name: `new Uint8Array([${name}])`,
		code: `const u = new Uint8Array([${value}]);\nreturn [{ json: { u, l: u.length, b: u[0], c: u[1] } }];`,
	},
]);

/**
 * Each other use of a typed array: the native code must refuse it (the host runs the node),
 * or give the result of the task runner.
 */
const EDGES: Case[] = [
	{
		name: 'iteration',
		code: 'const u = new Uint8Array([1, 2]);\nlet s = 0;\nfor (const x of u) s += x;\nreturn [{ json: { s } }];',
	},
	{ name: 'spread', code: 'const u = new Uint8Array([1, 2]);\nreturn [{ json: { a: [...u] } }];' },
	{
		name: 'map',
		code: 'const u = new Uint8Array([1, 2]);\nreturn [{ json: { a: u.map((x) => x + 1) } }];',
	},
	{
		name: 'toString',
		code: 'const u = new Uint8Array([1, 2]);\nreturn [{ json: { s: u.toString() } }];',
	},
	{
		name: 'JSON.stringify',
		code: 'const u = new Uint8Array([1, 2]);\nreturn [{ json: { s: JSON.stringify(u) } }];',
	},
	{
		name: 'Object.keys',
		code: 'const u = new Uint8Array([1, 2]);\nreturn [{ json: { k: Object.keys(u) } }];',
	},
	{
		name: 'Buffer.from',
		code: 'const u = new Uint8Array([104, 105]);\nreturn [{ json: { t: Buffer.from(u).toString() } }];',
	},
	{
		name: 'an argument of a function',
		code: 'function len(x) {\n  return x.length;\n}\nconst u = new Uint8Array([1, 2]);\nreturn [{ json: { l: len(u) } }];',
	},
	{
		name: 'a test of the type',
		code: 'const u = new Uint8Array([1]);\nreturn [{ json: { i: u instanceof Uint8Array } }];',
	},
	{
		name: 'String()',
		code: 'const u = new Uint8Array([1, 2]);\nreturn [{ json: { s: String(u) } }];',
	},
	{
		name: 'a template',
		code: 'const u = new Uint8Array([1, 2]);\nreturn [{ json: { s: `${u}` } }];',
	},
	{
		name: 'the length by an index',
		code: "const u = new Uint8Array([1, 2]);\nreturn [{ json: { l: u['length'] } }];",
	},
	{
		name: 'a write with a text index',
		code: "const u = new Uint8Array(2);\nu['x'] = 9;\nreturn [{ json: { u } }];",
	},
	{
		name: 'a compound write',
		code: 'const u = new Uint8Array([1]);\nu[0] += 300;\nreturn [{ json: { u } }];',
	},
	{
		name: 'a write of the length',
		code: 'const u = new Uint8Array([1]);\nu.length = 3;\nreturn [{ json: { u } }];',
	},
	{
		name: 'an alias with let',
		code: 'const u = new Uint8Array([1, 2]);\nlet w = u;\nreturn [{ json: { l: w.length } }];',
	},
	{
		name: 'a slice',
		code: 'const u = new Uint8Array([1, 2]);\nreturn [{ json: { a: u.slice(1) } }];',
	},
	{
		name: 'a value of another typed array type',
		code: 'const u = new Uint8Array([1]);\nconst w = new Int8Array(u);\nreturn [{ json: { w } }];',
	},
	{
		name: 'a typed array of an ArrayBuffer',
		code: 'const u = new Uint8Array(new ArrayBuffer(2));\nreturn [{ json: { u } }];',
	},
	{ name: 'the type as a value', code: 'return [{ json: { t: typeof Uint8Array } }];' },
	{ name: 'a result that is a typed array', code: 'return new Uint8Array([1, 2]);' },
	{
		name: 'a typed array in a call of a helper',
		code: 'const u = new Uint8Array([1, 2]);\nreturn [{ json: { a: Math.max(...u) } }];',
	},
	{
		name: 'a typed array as a key of an object in a loop',
		code: 'const out = {};\nfor (const i of items) out[String(i.json.a)] = new Uint8Array([i.json.a]);\nreturn [{ json: { out } }];',
	},
];

describe.skipIf(!taskRunnerAvailable())(
	"native Code nodes: typed arrays against n8n's task runner",
	() => {
		// n8n's modules and the runner process take some seconds to start.
		beforeAll(async () => await startRunner(), 120_000);

		it.each(CASES)('$name', async ({ code, mode = 'all' }) => {
			expect(nativeCode(code, mode, ITEMS)).toEqual(await runnerCode(code, mode, ITEMS));
		});

		it.each(GENERATED)('$name', async ({ code, mode = 'all' }) => {
			expect(nativeCode(code, mode, ITEMS)).toEqual(await runnerCode(code, mode, ITEMS));
		});

		it.each(EDGES)('equal or refused: $name', async ({ code, mode = 'all' }) => {
			let native: unknown;
			try {
				native = nativeCode(code, mode, ITEMS);
			} catch (error) {
				// The translation refuses the code: the fallback host runs the node.
				expect(String(error)).toMatch(/blocked|does not compile/);
				return;
			}
			expect(native).toEqual(await runnerCode(code, mode, ITEMS));
		});
	},
);

const handsOver = (r: { ok: boolean; error?: string }): boolean =>
	!r.ok && typeof r.error === 'string' && r.error.includes(RUNS_IN_HOST);

describe.skipIf(!taskRunnerAvailable())('a typed array above the bound hands the node over', () => {
	beforeAll(async () => await startRunner(), 120_000);

	const ABOVE = [
		{ name: 'a count above the bound', code: sizeCase(`${BOUND + 1}`) },
		{ name: 'a count far above the bound', code: sizeCase('4294967296') },
			{
			name: 'an array-like length above the bound',
			code: `const u = new Uint8Array({ length: ${BOUND + 1} });\nreturn [{ json: { l: u.length } }];`,
		},
		{
			name: 'an array-like length of 1e10',
			code: 'const u = new Uint8Array({ length: 1e10 });\nreturn [{ json: { l: u.length } }];',
		},
	];

	it.each(ABOVE)('$name', ({ code }) => {
		expect(handsOver(nativeCode(code, 'all', ITEMS))).toBe(true);
	});

	it('the host gives the result of v1 for a count above the bound', async () => {
		expect(await runnerCode(ABOVE[0].code, 'all', ITEMS)).toEqual({
			ok: true,
			value: [{ l: BOUND + 1 }],
		});
	});

	it('the translation carries the host form', () => {
		const t = translateCode({
			code: ABOVE[0].code,
			mode: 'all',
			kind: 'code',
			hasNode: () => false,
		});
		if (!t.ok) throw new Error(t.blockers.map((b) => b.feature).join(', '));
		expect(t.translation.handsOver).toBe(true);
		expect(t.translation.helpers.has('taNewHost')).toBe(true);
	});
});

describe('the feature of each refusal of a typed array', () => {
	const blocked = (code: string): string[] => {
		let native: unknown;
		try {
			native = nativeCode(code, 'all', ITEMS);
		} catch (error) {
			return String(error)
				.replace(/^Error: blocked: /, '')
				.split(', ');
		}
		throw new Error(`not refused: ${JSON.stringify(native)}`);
	};

	it.each([
		['iteration', 'for (const x of u) { s += x; }', 'typed array'],
		['spread', 'const a = [...u];', 'typed array'],
		['a method', 'const a = u.map((x) => x);', 'typed array'],
		['a call', 'const a = f(u);', 'typed array'],
		['the type', 'const a = u instanceof Uint8Array;', 'global Uint8Array'],
	])('%s names the form that the node cannot run natively', (_name, body, feature) => {
		expect(
			blocked(
				`const u = new Uint8Array([1, 2]);\nfunction f(x) { return 1; }\nlet s = 0;\n${body}\nreturn [{ json: { s } }];`,
			),
		).toContain(feature);
	});
});
