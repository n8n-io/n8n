/**
 * A pause in a native Code node: `await new Promise((resolve) => setTimeout(resolve, ms))`,
 * also through a function of the code that gives such a promise (`await sleep(ms)`).
 *
 * The native code is the async form of a Code node with one `wait` effect for each pause
 * (`ctx.wait`). Code without a pause and without a request keeps the form without `async`:
 * the last suite proves that it has no cost of the async form.
 *
 * Each case runs as native code in the bytecode VM and as a Code node in n8n's engine with
 * its real task runner (`runner-oracle.ts`), with short pauses. The results must be the same.
 * The data is made up.
 */
import { beforeAll, describe, expect, it } from 'vitest';

import type { EffectRecord } from '../../../reference/runner.ts';
import { runReference, useUtc } from '../../../reference/runner.ts';
import { convertWorkflow } from '../../index.ts';
import type { CodeMode } from '../translate.ts';
import { translateCode } from '../translate.ts';
import { nativeCode, runnerCode, startRunner, taskRunnerAvailable } from './runner-oracle.ts';

useUtc();

interface Case {
	name: string;
	code: string;
	mode?: CodeMode;
}

const ITEMS = [{ a: 1 }, { a: 2 }, { a: 3 }];

const CASES: Case[] = [
	{
		name: 'a pause at the top',
		code: 'const before = items.length;\nawait new Promise((resolve) => setTimeout(resolve, 5));\nreturn [{ json: { before, after: items.length } }];',
	},
	{
		name: 'the value of a pause is undefined',
		code: 'const v = await new Promise((r) => setTimeout(r, 2));\nconst w = await new Promise((resolve) => { setTimeout(() => resolve(), 2); });\nconst x = await new Promise((done) => setTimeout(() => { done(); }, 2));\nreturn [{ json: { v: v === undefined, w: w === undefined, x: x === undefined } }];',
	},
	{
		name: 'a pause in a loop over the items',
		code: 'const out = [];\nfor (const item of items) {\n  out.push({ json: { a: item.json.a * 2 } });\n  await new Promise((resolve) => setTimeout(resolve, 3));\n}\nreturn out;',
	},
	{
		name: 'a function in a constant that gives the promise',
		code: 'const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));\nconst out = [];\nfor (let k = 0; k < items.length; k++) {\n  if (k > 0) await sleep(2);\n  out.push({ json: { k, a: items[k].json.a } });\n}\nreturn out;',
	},
	{
		name: 'a function declaration that gives the promise',
		code: 'function delay(ms) {\n  return new Promise((resolve) => setTimeout(resolve, ms));\n}\nawait delay(4);\nconst first = items[0].json.a;\nawait delay(1);\nreturn [{ json: { first } }];',
	},
	{
		name: 'an async function that waits, and a function that calls it',
		code: 'const wait = async (ms) => new Promise((r) => setTimeout(r, ms));\nasync function slowDouble(x) {\n  await wait(2);\n  return x * 2;\n}\nconst out = [];\nfor (const i of items) out.push({ json: { v: await slowDouble(i.json.a) } });\nreturn out;',
	},
	{
		name: 'a pause with a time that is not a plain number',
		code: 'await new Promise((r) => setTimeout(r, "3"));\nawait new Promise((r) => setTimeout(r, -5));\nawait new Promise((r) => setTimeout(r, undefined));\nawait new Promise((r) => setTimeout(r, 0.4));\nawait new Promise((r) => setTimeout(r, NaN));\nawait new Promise((r) => setTimeout(r, items[0].json.missing));\nreturn [{ json: { done: true } }];',
	},
	{
		name: 'an error after a pause has its line',
		code: 'const a = 1;\nawait new Promise((resolve) => setTimeout(resolve, 2));\nconst b = items[0].json.zz.y;\nreturn [{ json: { a, b } }];',
	},
	{
		name: 'an error in a function after a pause has the line of the function',
		code: 'const sleep = (ms) => new Promise((r) => setTimeout(r, ms));\nasync function work(i) {\n  await sleep(1);\n  if (i.json.a === 2) throw new Error("item two");\n  return i.json.a;\n}\nconst out = [];\nfor (const i of items) out.push({ json: { v: await work(i) } });\nreturn out;',
	},
	{
		name: 'a try block around a pause, without the error',
		code: 'let state = "start";\ntry {\n  await new Promise((r) => setTimeout(r, 2));\n  state = "waited";\n  items[0].json.zz.y;\n} catch {\n  state += " then failed";\n}\nreturn [{ json: { state } }];',
	},
	{
		name: 'each item mode',
		code: 'await new Promise((resolve) => setTimeout(resolve, 2));\nreturn { json: { a: $json.a + 1 } };',
		mode: 'each',
	},
	{
		name: 'a pause that the code does not reach',
		code: 'if (items.length > 100) {\n  await new Promise((resolve) => setTimeout(resolve, 60000));\n}\nreturn items.map((i) => ({ json: { a: i.json.a } }));',
	},
];

/** Forms with timers or promises that are no plain pause: the node stays in the host. */
const REFUSED: Case[] = [
	{ name: 'a promise that the code does not wait for', code: 'new Promise((r) => setTimeout(r, 5));\nreturn [];' },
	{ name: 'a pause in a value', code: 'const p = new Promise((r) => setTimeout(r, 5));\nawait p;\nreturn [];' },
	{ name: 'a timer with a callback of the code', code: 'let n = 0;\nawait new Promise((r) => setTimeout(() => { n = 1; r(); }, 5));\nreturn [{ json: { n } }];' },
	{ name: 'a value for the promise', code: 'const v = await new Promise((r) => setTimeout(() => r(5), 5));\nreturn [{ json: { v } }];' },
	{ name: 'a third argument of the timer', code: 'const v = await new Promise((r) => setTimeout(r, 5, "x"));\nreturn [{ json: { v } }];' },
	{ name: 'the reject function', code: 'await new Promise((resolve, reject) => setTimeout(reject, 5));\nreturn [];' },
	{ name: 'a timer without a promise', code: 'setTimeout(() => {}, 5);\nreturn [];' },
	{ name: 'pauses that run at the same time', code: 'const sleep = (ms) => new Promise((r) => setTimeout(r, ms));\nconst out = [];\nawait Promise.all([sleep(5).then(() => out.push(1)), sleep(1).then(() => out.push(2))]);\nreturn [{ json: { out } }];' },
	{ name: 'a pause in a mapper of Promise.all', code: 'const sleep = (ms) => new Promise((r) => setTimeout(r, ms));\nconst out = await Promise.all(items.map(async (i) => { await sleep(i.json.a); return { json: i.json }; }));\nreturn out;' },
	{ name: 'a sleep function that the code does not wait for', code: 'const sleep = (ms) => new Promise((r) => setTimeout(r, ms));\nsleep(5);\nreturn [];' },
	{ name: 'setInterval', code: 'await new Promise((r) => setInterval(r, 5));\nreturn [];' },
];

describe.skipIf(!taskRunnerAvailable())('a pause in a native Code node against the task runner', () => {
	beforeAll(async () => {
		await startRunner();
	}, 60_000);

	it.each(CASES)('$name', async ({ code, mode = 'all' }) => {
		const native = nativeCode(code, mode, ITEMS);
		expect(native).toEqual(await runnerCode(code, mode, ITEMS));
	});
});

describe('which code has a pause', () => {
	const translate = (code: string) =>
		translateCode({ code, mode: 'all', kind: 'code', hasNode: () => false });

	it.each(REFUSED)('refuses: $name', ({ code }) => {
		let refused = false;
		try {
			nativeCode(code, 'all', ITEMS);
		} catch (error) {
			refused = /blocked|does not compile/.test(String(error));
		}
		expect(refused).toBe(true);
	});

	it('gives code with a pause the async form, and other code the form without it', () => {
		const paused = translate('await new Promise((r) => setTimeout(r, 5));\nreturn [];');
		expect(paused.ok && paused.translation.usesAsync).toBe(true);
		expect(paused.ok && paused.translation.usesHttp).toBe(false);
		const plain = translate(
			'async function double(x) {\n  return x * 2;\n}\nconst out = [];\nfor (const i of items) out.push({ json: { v: await double(i.json.a) } });\nreturn out;',
		);
		expect(plain.ok && plain.translation.usesAsync).toBe(false);
		// Code without a pause and without a request: no `async`, no `await`, no promise.
		expect(plain.ok && /\basync\b|\bawait\b/.test(plain.translation.body)).toBe(false);
	});
});

const hook = {
	name: 'Hook',
	type: 'n8n-nodes-base.webhook',
	typeVersion: 2,
	position: [0, 0],
	parameters: { path: 'a' },
};

/** Converts and runs `Hook -> Slow`, and gives the `wait` effects of the run. */
async function run(jsCode: string): Promise<{ fallback: string[]; status: string; items: unknown; waits: EffectRecord[]; source: string }> {
	const wf = {
		name: 'Pauses',
		nodes: [
			hook,
			{ name: 'Slow', type: 'n8n-nodes-base.code', typeVersion: 2, position: [200, 0], parameters: { jsCode } },
		],
		connections: { Hook: { main: [[{ node: 'Slow', type: 'main', index: 0 }]] } },
	};
	const out = convertWorkflow(wf, { trace: 'all' });
	expect(out.ok).toBe(true);
	const ran = await runReference(out.source, { trigger: { body: { n: 3 } }, now: 0, seed: 1, effects: {}, trace: true });
	return {
		fallback: out.fallbackNodes,
		status: ran.status,
		items: (ran.trace ?? []).find((t) => t.step === 'Slow')?.items,
		waits: ran.effects.filter((e) => e.kind === 'wait'),
		source: out.source,
	};
}

describe('a converted workflow with a pause in a Code node', () => {
	it('has one wait effect for each pause, with the time of the timer', async () => {
		const r = await run(
			'const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));\nconst out = [];\nfor (let k = 0; k < items[0].json.body.n; k++) {\n  await sleep(100 * (k + 1));\n  out.push({ json: { k } });\n}\nawait new Promise((r) => setTimeout(r, -1));\nreturn out;',
		);
		expect(r.fallback).toEqual([]);
		expect(r.status).toBe('ok');
		expect(r.items).toEqual([{ k: 0 }, { k: 1 }, { k: 2 }]);
		expect(r.waits.map((w) => [w.step, (w.args as { duration?: number }).duration])).toEqual([
			['Slow (wait)', 100],
			['Slow (wait)', 200],
			['Slow (wait)', 300],
			// As Node.js: a time that is not from 1 to 2147483647 is 1.
			['Slow (wait)', 1],
		]);
	});

	it('keeps code without a pause free of the async form', async () => {
		const r = await run('return items.map((i) => ({ json: { n: i.json.body.n + 1 } }));');
		expect(r.items).toEqual([{ n: 4 }]);
		expect(r.waits).toEqual([]);
		expect(r.source).not.toContain('(wait)');
		expect(r.source).not.toMatch(/const \w+Run = async/);
	});
});
