/**
 * A native Code node that hands itself over to the fallback host at run time
 * (`Translation.handsOver`, `lowerCodeNative`).
 *
 * Some forms are exact only for common inputs. For another input a helper throws an error
 * with the mark of `RUNS_IN_HOST`, and the workflow runs the host form of the node in the same
 * run: the v1 code, with v1's result. Code without a request and without static data has no
 * effect before that point, so the host can run the whole node.
 *
 * The form that these tests use is a regular expression with a computed pattern
 * (`new RegExp(text)`, `text.match(other)`). The engine of the runtime has a subset of the
 * patterns of JavaScript and one error for both a pattern outside the subset and text that
 * is not a pattern. The first suite compares the native code with n8n's real Code node and
 * task runner (`runner-oracle.ts`). The data is made up.
 */
import { beforeAll, describe, expect, it } from 'vitest';

import type { EffectRecord } from '../../../reference/runner.ts';
import { runReference, useUtc } from '../../../reference/runner.ts';
import { RUNS_IN_HOST } from '../../helpers.ts';
import { convertWorkflow } from '../../index.ts';
import { translateCode } from '../translate.ts';
import { nativeCode, runnerCode, startRunner, taskRunnerAvailable } from './runner-oracle.ts';

useUtc();

/** True for the error of a hand-over: the fallback host runs the node. */
const handsOver = (r: { ok: boolean; error?: string }): boolean =>
	!r.ok && typeof r.error === 'string' && r.error.includes(RUNS_IN_HOST);

interface Case {
	name: string;
	code: string;
}

const CASES: Case[] = [
	{
		name: 'new RegExp of a field',
		code: 'return items.map((i) => {\n  const re = new RegExp(i.json.pattern, "gi");\n  return { json: { hits: (i.json.text.match(re) || []).length, clean: i.json.text.replace(re, "#") } };\n});',
	},
	{
		name: 'new RegExp in a try block without the error',
		code: 'const out = [];\nfor (const i of items) {\n  try {\n    const re = new RegExp("^" + i.json.pattern + "$");\n    out.push({ json: { ok: re.test(i.json.text) } });\n  } catch {\n    out.push({ json: { ok: null } });\n  } finally {\n    out.push({ json: { done: true } });\n  }\n}\nreturn out;',
	},
	{
		name: 'match and search with a pattern that is text',
		code: 'return items.map((i) => ({ json: { m: i.json.text.match(i.json.pattern), s: i.json.text.search(i.json.pattern), all: [...i.json.text.matchAll(i.json.pattern)].map((m) => m[0]) } }));',
	},
	{
		name: 'a function with a name makes the pattern',
		code: 'function finder(word) {\n  return new RegExp("\\\\b" + word + "\\\\b", "i");\n}\nreturn items.map((i) => ({ json: { found: finder(i.json.pattern).test(i.json.text) } }));',
	},
];

/** Patterns that the engine has: the native code gives the result of v1. */
const SUPPORTED = [
	{ pattern: 'a+', text: 'caaat Aa' },
	{ pattern: '[0-9]{2,}', text: 'no 12345 and 6' },
	{ pattern: 'needle', text: 'hay needle hay NEEDLE' },
	{ pattern: '(x|y)z?', text: 'xz y xyz' },
];

/** Text that is not a pattern: JavaScript throws a SyntaxError, and the host gives it. */
const INVALID = [
	{ pattern: '(', text: 'a(b' },
	{ pattern: '[a-', text: 'abc' },
	{ pattern: '*a', text: 'aaa' },
	{ pattern: 'a{2,1}', text: 'aaa' },
];

describe.skipIf(!taskRunnerAvailable())('a computed pattern against the task runner', () => {
	beforeAll(async () => {
		await startRunner();
	}, 60_000);

	it.each(CASES)('patterns of the engine run as native code: $name', async ({ code }) => {
		const native = nativeCode(code, 'all', SUPPORTED);
		expect(handsOver(native)).toBe(false);
		expect(native).toEqual(await runnerCode(code, 'all', SUPPORTED));
		expect(native.ok).toBe(true);
	});

	it.each(CASES)('text that is not a pattern hands the node over: $name', ({ code }) => {
		for (const item of INVALID) {
			expect(handsOver(nativeCode(code, 'all', [SUPPORTED[0], item])), item.pattern).toBe(true);
		}
	});

	it('v1 gives the error of JavaScript for text that is not a pattern: the host gives it too', async () => {
		const r = await runnerCode(CASES[0].code, 'all', [INVALID[0]]);
		expect(r).toEqual({
			ok: false,
			// The line of the call that runs the callback: the callback has no name.
			error: 'Invalid regular expression: /(/gi: Unterminated group [line 1]',
		});
	});
});

describe('which code hands over', () => {
	const translation = (code: string) => {
		const t = translateCode({ code, mode: 'all', kind: 'code', hasNode: () => false });
		if (!t.ok) throw new Error(t.blockers.map((b) => b.feature).join(', '));
		return t.translation;
	};

	it('code with a computed pattern, and its catch blocks give the mark to the node', () => {
		const t = translation(
			'try {\n  return [{ json: { ok: new RegExp(items[0].json.p).test("a") } }];\n} catch {\n  return [];\n}',
		);
		expect(t.handsOver).toBe(true);
		expect(t.helpers.has('regexNewHost')).toBe(true);
		expect(t.body).toContain('catch (__wf_h) { if (fileLimitInHost(__wf_h)) throw __wf_h;');
	});

	it('not code with a literal pattern: it has no cost of a hand-over', () => {
		const t = translation(
			'try {\n  return [{ json: { ok: /a+/.test(items[0].json.p), n: new RegExp("b", "g").source } }];\n} catch (e) {\n  return [];\n}',
		);
		expect(t.handsOver).toBe(false);
		expect(t.body).not.toContain('fileLimitInHost');
		expect(t.helpers.has('fileLimitInHost')).toBe(false);
	});

	it('not code with a request or static data: the host cannot run it again', () => {
		const withRequest = translation(
			'const r = await this.helpers.httpRequest({ method: "GET", url: "https://api.example.test/a" });\nreturn [{ json: { ok: new RegExp(r.p).test("a") } }];',
		);
		expect(withRequest.handsOver).toBe(false);
		expect(withRequest.helpers.has('regexNew')).toBe(true);
		const withStatic = translation(
			'const s = $getWorkflowStaticData("global");\ns.n = (s.n || 0) + 1;\nreturn [{ json: { ok: "abc".match(items[0].json.p) !== null } }];',
		);
		expect(withStatic.handsOver).toBe(false);
		expect(withStatic.helpers.has('regexFrom')).toBe(true);
	});
});

const hook = {
	name: 'Hook',
	type: 'n8n-nodes-base.webhook',
	typeVersion: 2,
	position: [0, 0],
	parameters: { path: 'a' },
};

const HOST_STEP = 'Find (fallback host)';

interface Run {
	fallback: string[];
	status: string;
	items: unknown;
	host: EffectRecord[];
}

/** Converts and runs `Hook -> Find`: the Code node makes a pattern from the request body. */
async function run(
	jsCode: string,
	body: unknown,
	settings: Record<string, unknown> = {},
): Promise<Run> {
	const wf = {
		name: 'Patterns',
		nodes: [
			hook,
			{
				name: 'Find',
				type: 'n8n-nodes-base.code',
				typeVersion: 2,
				position: [200, 0],
				parameters: { jsCode },
				...settings,
			},
		],
		connections: { Hook: { main: [[{ node: 'Find', type: 'main', index: 0 }]] } },
	};
	const out = convertWorkflow(wf, { trace: 'all' });
	expect(out.ok).toBe(true);
	const ran = await runReference(
		out.source,
		{ trigger: { body }, now: 0, seed: 1, effects: {}, trace: true },
		{
			// The fallback host: the answer names the step, so the test sees which form ran.
			answer: async (effect) => (effect.step === HOST_STEP ? [{ fromHost: true }] : undefined),
		},
	);
	return {
		fallback: out.fallbackNodes,
		status: ran.status,
		items: (ran.trace ?? []).find((t) => t.step === 'Find')?.items,
		host: ran.effects.filter((e) => e.step === HOST_STEP),
	};
}

describe('a converted workflow hands a Code node over to the fallback host', () => {
	const CODE =
		'const out = [];\nfor (const i of items) {\n  try {\n    out.push({ json: { hit: new RegExp(i.json.body.pattern).test(i.json.body.text) } });\n  } catch (e) {\n    out.push({ json: { hit: null } });\n  }\n}\nreturn out;';

	it('runs a pattern of the engine as native code: no step of the fallback host', async () => {
		const r = await run(CODE, { pattern: 'b+', text: 'abbc' });
		expect(r.fallback).toEqual([]);
		expect(r.status).toBe('ok');
		expect(r.host).toEqual([]);
		expect(r.items).toEqual([{ hit: true }]);
	});

	it('runs the node in the fallback host for text that is not a pattern', async () => {
		const r = await run(CODE, { pattern: '(', text: 'abbc' });
		// The node counts as compiled: the host form is a part of its compiled form.
		expect(r.fallback).toEqual([]);
		expect(r.status).toBe('ok');
		expect(r.host.length).toBe(1);
		expect(r.items).toEqual([{ fromHost: true }]);
	});

	it.each([
		['continue', { onError: 'continueRegularOutput' }],
		['retry on fail', { retryOnFail: true, maxTries: 2, waitBetweenTries: 0 }],
		[
			'retry on fail and continue',
			{ retryOnFail: true, maxTries: 2, onError: 'continueRegularOutput' },
		],
	])('hands over under the setting "%s" too', async (_name, settings) => {
		const code =
			'return items.map((i) => ({ json: { hit: new RegExp(i.json.body.pattern).test(i.json.body.text) } }));';
		const native = await run(code, { pattern: 'b+', text: 'abbc' }, settings);
		expect(native.host).toEqual([]);
		expect(native.items).toEqual([{ hit: true }]);
		const host = await run(code, { pattern: '[a-', text: 'abbc' }, settings);
		expect(host.fallback).toEqual([]);
		expect(host.status).toBe('ok');
		expect(host.host.length).toBe(1);
		expect(host.items).toEqual([{ fromHost: true }]);
	});

	it('hands over under "continue (using error output)": both outputs come from the host', async () => {
		const code =
			'return items.map((i) => ({ json: { hit: new RegExp(i.json.body.pattern).test(i.json.body.text) } }));';
		const settings = { onError: 'continueErrorOutput' };
		const native = await run(code, { pattern: 'b+', text: 'abbc' }, settings);
		expect(native.host).toEqual([]);
		const host = await run(code, { pattern: '[a-', text: 'abbc' }, settings);
		expect(host.fallback).toEqual([]);
		expect(host.status).toBe('ok');
		expect(host.host.length).toBe(1);
	});

	it('an error of the code itself is not a hand-over: the node fails as before', async () => {
		const code =
			'const re = new RegExp(items[0].json.body.pattern);\nthrow new Error("own error " + re.source);';
		const r = await run(code, { pattern: 'b+', text: 'abbc' });
		expect(r.host).toEqual([]);
		expect(r.status).toBe('error');
	});
});
