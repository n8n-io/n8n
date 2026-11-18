/**
 * A `let` or a `const` that the code reads before its declaration ran. JavaScript throws
 * `ReferenceError: Cannot access '<name>' before initialization`; the subset reads
 * undefined. The translation keeps such code in the fallback host (`translate.ts`,
 * "variables that the code can read before their declaration").
 *
 * The first suite shows what n8n's task runner gives for each refused form, so the reason
 * for the refusal stays visible. The second suite proves that the ordinary forms stay
 * native and give the result of the task runner. The data is made up.
 */
import { beforeAll, describe, expect, it } from 'vitest';

import { useUtc } from '../../../reference/runner.ts';
import { translateCode } from '../translate.ts';
import { nativeCode, runnerCode, startRunner, taskRunnerAvailable } from './runner-oracle.ts';

useUtc();

const FEATURE = 'a variable before its declaration';

const blockers = (code: string): string[] => {
	const t = translateCode({ code, mode: 'all', kind: 'code', hasNode: () => false });
	return t.ok ? [] : t.blockers.map((b) => b.feature);
};

interface Case {
	name: string;
	code: string;
}

/** Forms where v1 throws for the read, each with the result of v1. */
const REFUSED: Array<Case & { v1: unknown }> = [
	{
		name: 'a const of a switch clause, read in a later clause',
		code: 'const out = [];\nfor (const k of [2, 1]) {\n  try {\n    switch (k) {\n      case 1:\n        const u = 5;\n        out.push({ json: { k, h: u } });\n        break;\n      case 2:\n        out.push({ json: { k, t: typeof u } });\n        break;\n    }\n  } catch (e) {\n    out.push({ json: { k, failed: true } });\n  }\n}\nreturn out;',
		v1: {
			ok: true,
			value: [
				{ k: 2, failed: true },
				{ k: 1, h: 5 },
			],
		},
	},
	{
		name: 'a let of a switch clause, read in the default clause',
		code: 'const out = [];\nfor (const k of [2, 1]) {\n  switch (k) {\n    case 1:\n      let u = 5;\n      out.push({ json: { k, h: u } });\n      break;\n    default:\n      out.push({ json: { k, t: u } });\n  }\n}\nreturn out;',
		v1: { ok: false, error: "Cannot access 'u' before initialization [line 9]" },
	},
	{
		name: 'a function declaration that the code calls before the declaration of a const that it reads',
		code: 'function read() {\n  return late;\n}\nconst out = [];\ntry {\n  out.push({ json: { v: read() } });\n} catch {\n  out.push({ json: { failed: true } });\n}\nconst late = 1;\nreturn out;',
		v1: { ok: true, value: [{ failed: true }] },
	},
	{
		name: 'a function in a constant that the code calls before the declaration of a let that it reads',
		code: 'const read = () => late + 1;\nlet v = "none";\ntry {\n  v = read();\n} catch {\n  v = "failed";\n}\nlet late = 1;\nreturn [{ json: { v } }];',
		v1: { ok: true, value: [{ v: 'failed' }] },
	},
	{
		name: 'a callback of a call before the declaration of a const that it reads',
		code: 'let out = [];\ntry {\n  out = items.map((i) => ({ json: { v: i.json.a * factor } }));\n} catch {\n  out = [{ json: { failed: true } }];\n}\nconst factor = 2;\nreturn out;',
		v1: { ok: true, value: [{ failed: true }] },
	},
	{
		name: 'a function that another function calls before the declaration',
		code: 'function inner() {\n  return late;\n}\nfunction outer() {\n  return inner();\n}\nlet v = "none";\ntry {\n  v = outer();\n} catch {\n  v = "failed";\n}\nconst late = 1;\nreturn [{ json: { v } }];',
		v1: { ok: true, value: [{ v: 'failed' }] },
	},
];

/** Ordinary forms: the code runs the function after the declaration. They stay native. */
const NATIVE: Case[] = [
	{
		name: 'a function declaration before a const that it reads, called after it',
		code: 'function scale(x) {\n  return x * FACTOR;\n}\nconst FACTOR = 3;\nreturn items.map((i) => ({ json: { v: scale(i.json.a) } }));',
	},
	{
		name: 'a function in a constant before a let that it reads, called after it',
		code: 'const label = (x) => prefix + x;\nlet prefix = "n";\nprefix += "-";\nreturn items.map((i) => ({ json: { v: label(i.json.a) } }));',
	},
	{
		name: 'functions that call each other, declared before the constants',
		code: 'function a(x) {\n  return b(x) + STEP;\n}\nfunction b(x) {\n  return x * SCALE;\n}\nconst STEP = 1;\nconst SCALE = 10;\nreturn items.map((i) => ({ json: { v: a(i.json.a) } }));',
	},
	{
		name: 'a switch with a block for each clause',
		code: 'const out = [];\nfor (const i of items) {\n  switch (i.json.a) {\n    case 1: {\n      const u = "one";\n      out.push({ json: { u } });\n      break;\n    }\n    default: {\n      const u = "other";\n      out.push({ json: { u } });\n    }\n  }\n}\nreturn out;',
	},
	{
		name: 'a switch clause that uses only its own const',
		code: 'const out = [];\nfor (const i of items) {\n  switch (i.json.a) {\n    case 1:\n      const one = "one";\n      out.push({ json: { v: one } });\n      break;\n    case 2:\n      const two = "two";\n      out.push({ json: { v: two } });\n      break;\n  }\n}\nreturn out;',
	},
	{
		name: 'a callback after the declaration',
		code: 'const factor = 2;\nconst out = items.map((i) => ({ json: { v: i.json.a * factor } }));\nreturn out;',
	},
	{
		name: 'a callback in a function declaration that the code calls after the declaration',
		code: 'function all() {\n  return items.map((i) => ({ json: { v: i.json.a * factor } }));\n}\nconst factor = 2;\nreturn all();',
	},
	{
		name: 'an arrow function that reads a later const and a later arrow function',
		code: 'const total = (list) => list.reduce((sum, x) => sum + weigh(x), START);\nconst weigh = (x) => x * WEIGHT;\nconst WEIGHT = 3;\nconst START = 100;\nreturn [{ json: { v: total(items.map((i) => i.json.a)) } }];',
	},
	{
		name: 'a var has no such error',
		code: 'function read() {\n  return late;\n}\nconst v = read();\nvar late = 1;\nreturn [{ json: { v: v === undefined, late } }];',
	},
];

const ITEMS = [{ a: 1 }, { a: 2 }];

describe('a variable that the code can read before its declaration', () => {
	it.each(REFUSED)('refuses: $name', ({ code }) => {
		expect(blockers(code)).toContain(FEATURE);
	});

	it.each(NATIVE)('keeps native: $name', ({ code }) => {
		expect(blockers(code)).toEqual([]);
	});
});

describe.skipIf(!taskRunnerAvailable())(
	'the dead zone of let and const against the task runner',
	() => {
		beforeAll(async () => {
			await startRunner();
		}, 60_000);

		it.each(REFUSED)('v1 stops the read: $name', async ({ code, v1 }) => {
			expect(await runnerCode(code, 'all', ITEMS)).toEqual(v1);
		});

		it.each(NATIVE)('native code gives the result of v1: $name', async ({ code }) => {
			const native = nativeCode(code, 'all', ITEMS);
			expect(native).toEqual(await runnerCode(code, 'all', ITEMS));
			expect(native.ok).toBe(true);
		});
	},
);
