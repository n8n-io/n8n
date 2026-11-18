/**
 * Date values of Code nodes on each executor. Each generated body (`dates-cases.ts`) runs as
 * native code in the bytecode VM and in the Zig runtime (`wfrt run`), and as a Code node in
 * the fallback host and in n8n's engine with its real task runner (`runner-oracle.ts`). The
 * task runner is the truth. Each other executor must give its result, or the translation must
 * refuse the code.
 *
 * `WF_DATE_CASES` sets the number of bodies (the default is 40). `WF_DATE_SEED` sets the seed.
 * `WF_DATE_SHARED=1` adds the bodies with a Date under two names and with setters.
 * `WF_DATE_REPORT` names a file for the report.
 * The Zig part runs when the runtime binary exists, and the task runner part when the built
 * n8n packages exist.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

import { PACKAGE_ROOT } from '../../../__tests__/helpers.ts';
import { encodeModule } from '../../../compiler/module.ts';
import { sha256 } from '../../../compiler/sha256.ts';
import { useUtc } from '../../../reference/runner.ts';
import { runModule } from '../../../testing/vm.ts';
import { hostRunners } from '../../__tests__/behaviour/compare.ts';
import { allItemsCode } from '../../code-node.ts';
import type { CodeMode } from '../translate.ts';
import { generator, input, makeBody, nativeModule } from './dates-cases.ts';
import { runnerCode, startRunner, taskRunnerAvailable } from './runner-oracle.ts';

useUtc();

/** `WF_DATE_SHARED=1`: the bodies also have a Date under two names, with setters. */
const SHARED = process.env.WF_DATE_SHARED === '1';
const WFRT = join(PACKAGE_ROOT, '..', '..', '..', 'workflow-runtime', 'zig-out', 'bin', 'wfrt');
const NOW = 1_700_000_000_000;

type Outcome = { ok: true; value: string } | { ok: false; error: string };

function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === 'object' && v !== null;
}

function outcome(out: unknown): Outcome {
	if (!isRecord(out)) return { ok: false, error: 'bad output' };
	if (out.status === 'ok') return { ok: true, value: JSON.stringify(out.result) };
	const r = out.result;
	return { ok: false, error: isRecord(r) ? String(r.message) : String(r) };
}

const translate = (code: string, mode: CodeMode = 'all') => nativeModule(code, mode, true);

function host(code: string): Outcome {
	try {
		const value = hostRunners().code({
			name: 'code',
			code: allItemsCode(code, false),
			items: structuredClone(input),
		});
		return { ok: true, value: JSON.stringify(value) };
	} catch (e) {
		return { ok: false, error: e instanceof Error ? e.message : String(e) };
	}
}

describe.skipIf(!taskRunnerAvailable())('Date values of Code nodes on each executor', () => {
	const dir = mkdtempSync(join(tmpdir(), 'wf-date-executors-'));
	const zig = existsSync(WFRT);
	beforeAll(async () => await startRunner(), 120_000);

	const wfrt = (data: Parameters<typeof runModule>[0], body: unknown): Outcome => {
		const m = join(dir, 'm.wfm');
		const f = join(dir, 'f.json');
		writeFileSync(m, encodeModule(data, sha256));
		writeFileSync(f, JSON.stringify({ trigger: { body }, now: NOW, seed: 1, effects: {} }));
		try {
			return outcome(JSON.parse(execFileSync(WFRT, ['run', m, f], { encoding: 'utf8' })));
		} catch (e) {
			return { ok: false, error: `wfrt: ${e instanceof Error ? e.message : String(e)}` };
		}
	};

	const ITEMS = [
		{ t: '2024-03-07T10:20:30.000Z', bad: 'x', ms: 1700000000000, k: 3 },
		{ t: 'no', bad: 'y', ms: 5, k: 1 },
	];

	/**
	 * A Date that leaves a Code node. The task runner sends the result as JSON: a Date is its ISO
	 * text and an invalid Date is null, in the `json` of an item, in the metadata of its binary
	 * data and in each list and object below. A Date in the place of an item, of its `json` or of
	 * its `binary` is the error of the node. `native` is false for code that stays in the host.
	 */
	const LEAVES: Array<{ code: string; mode?: CodeMode; native?: false }> = [
		{ code: 'return items.map((i) => ({ json: { d: new Date(i.json.t) } }));' },
		{
			code: 'return items.map((i) => ({ json: { d: new Date(i.json.t), o: { e: new Date(i.json.ms), a: [new Date(i.json.bad), [new Date(i.json.ms)], { z: new Date(i.json.t) }] } } }));',
		},
		{
			code: 'const a = [new Date(items[0].json.ms)]; return items.map((i) => ({ json: { a, n: a.length } }));',
		},
		{
			code: 'const d = new Date(items[0].json.ms); return [{ json: { a: d, b: d, same: [d, d] } }];',
		},
		{ code: 'return [{ json: new Date(items[0].json.ms) }];' },
		{ code: 'return [{ json: new Date(items[0].json.bad) }];' },
		{ code: 'return [new Date(items[0].json.ms)];' },
		{ code: 'return new Date(items[0].json.ms);' },
		{
			code: 'return [{ d: new Date(items[0].json.ms) }, { d: new Date(items[0].json.bad) }];',
		},
		{ code: 'return { d: new Date(items[0].json.ms) };' },
		{ code: 'return items.map((i, k) => ({ json: { k }, pairedItem: new Date(i.json.k) }));' },
		{
			code: 'return items.map((i, k) => ({ json: { k }, pairedItem: { item: new Date(i.json.k) } }));',
		},
		{
			code: 'return items.map((i, k) => ({ json: { k }, pairedItem: { item: k, at: new Date(i.json.ms) } }));',
		},
		{
			code: 'return items.map((i, k) => ({ json: { k }, pairedItem: [{ item: k, input: new Date(0) }] }));',
		},
		{
			code: "return items.map((i) => ({ json: {}, binary: { data: { data: 'aGk=', mimeType: 'text/plain', fileName: new Date(i.json.ms) } } }));",
		},
		{
			code: "return items.map((i) => ({ json: {}, binary: { data: { data: 'aGk=', mimeType: 'text/plain', fileName: 'a.txt', at: new Date(i.json.ms), bad: new Date(i.json.bad) } } }));",
		},
		{ code: 'return items.map((i) => ({ json: {}, binary: { data: new Date(i.json.ms) } }));' },
		{ code: 'return items.map((i) => ({ json: {}, binary: new Date(i.json.ms) }));' },
		{
			code: 'return items.map((i) => ({ json: { d: new Date(i.json.ms) }, index: new Date(i.json.ms) }));',
		},
		// The engine of v1 gives an item with an `error` member the message of that member.
		{
			code: 'return items.map((i) => ({ json: { d: new Date(i.json.ms) }, error: new Date(i.json.ms) }));',
			native: false,
		},
		{ code: "return items.map((i) => ({ json: { d: 1 }, error: 'e' }));", native: false },
		{ code: 'return [[{ json: { d: new Date(0) } }]];' },
		{ code: 'return [null, { json: { d: new Date(0) } }];' },
		{ mode: 'each', code: 'return { json: { d: new Date($json.t), a: [new Date($json.ms)] } };' },
		{ mode: 'each', code: 'return { d: new Date($json.t) };' },
		{ mode: 'each', code: 'return new Date($json.ms);' },
		{ mode: 'each', code: 'return { json: new Date($json.ms) };' },
		{
			mode: 'each',
			code: 'return { json: { k: 1 }, pairedItem: { item: new Date($json.k) } };',
		},
		{
			mode: 'each',
			code: "return { json: {}, binary: { data: { data: 'aGk=', mimeType: 'text/plain', at: new Date($json.ms) } } };",
		},
		{ mode: 'each', code: 'return { json: { d: 1 }, error: new Date($json.ms) };' },
		// An error of code with a Date value: the message and its line.
		{ code: 'const a = [new Date(items[0].json.ms)];\nthrow a[0];' },
		{ code: "const a = [new Date(items[0].json.ms)];\nthrow { message: 'm', at: a[0] };" },
		{
			code: 'const a = [new Date(items[0].json.bad)];\nconst b = 1;\nreturn [{ json: { v: a[0].toISOString() } }];',
		},
		{ code: 'const a = [new Date(0), null];\nreturn [{ json: { v: a[1].getTime() } }];' },
		{ code: "const a = [new Date(0), 'x'];\nreturn [{ json: { v: a[1].getTime() } }];" },
		{
			code: "const a = [new Date(0)];\nif (a[0] > 5) throw new Error('late ' + a[0].getTime());\nreturn [];",
		},
	];

	it.each(LEAVES)('gives a Date that leaves the node as the task runner does: $code', async (c) => {
		const mode = c.mode ?? 'all';
		const r = await runnerCode(c.code, mode, structuredClone(ITEMS));
		const runner: Outcome = r.ok
			? { ok: true, value: JSON.stringify(r.value) }
			: { ok: false, error: r.error };
		const t = translate(c.code, mode);
		expect('refused' in t).toBe(c.native === false);
		if ('refused' in t) return;
		const fixture = { body: { input: structuredClone(ITEMS), nodes: [] } };
		expect(
			outcome(runModule(t.data, { trigger: fixture, now: NOW, seed: 1, effects: {} })),
		).toEqual(runner);
		if (zig) expect(wfrt(t.data, fixture.body)).toEqual(runner);
	});

	it('gives the result of the task runner on each executor, or refuses the code', async () => {
		const cases = Number(process.env.WF_DATE_CASES ?? 40);
		const next = generator(Number(process.env.WF_DATE_SEED ?? 1));
		const wrong = new Map<string, { count: number; text: string }>();
		const refused = new Map<string, number>();
		const count = { equal: 0, refused: 0, hostDiffers: 0 };
		const helpers = new Set<string>();
		let use = '';
		const note = (executor: string, holder: string, code: string, got: Outcome, want: Outcome) => {
			const key = `${executor} | ${holder} | ${use}`;
			const entry = wrong.get(key) ?? {
				count: 0,
				text: `${code}\n    ${executor} ${JSON.stringify(got).slice(0, 300)}\n    runner ${JSON.stringify(want).slice(0, 300)}`,
			};
			entry.count++;
			wrong.set(key, entry);
		};
		for (let k = 0; k < cases; k++) {
			const body = makeBody(next, SHARED);
			use = body.uses.join(' ; ');
			const t = translate(body.code);
			const r = await runnerCode(body.code, 'all', structuredClone(input));
			// The native form gives the message of the task runner with its line.
			const runner: Outcome = r.ok
				? { ok: true, value: JSON.stringify(r.value) }
				: { ok: false, error: r.error };
			const h = host(body.code);
			// The host gives no message that the test can compare: it stands in for the result only.
			const hostEqual = h.ok === runner.ok && (!h.ok || !runner.ok || h.value === runner.value);
			if (!hostEqual) {
				count.hostDiffers++;
				note('host', body.holder, body.code, h, runner);
			}
			if ('refused' in t) {
				count.refused++;
				refused.set(t.refused, (refused.get(t.refused) ?? 0) + 1);
				continue;
			}
			for (const h of t.helpers) helpers.add(h);
			const fixture = { body: { input: structuredClone(input), nodes: [] } };
			const vm = outcome(runModule(t.data, { trigger: fixture, now: NOW, seed: 1, effects: {} }));
			const executors: Array<[string, Outcome]> = [['vm', vm]];
			if (zig) executors.push(['wfrt', wfrt(t.data, fixture.body)]);
			let same = true;
			for (const [name, got] of executors) {
				if (JSON.stringify(got) === JSON.stringify(runner)) continue;
				same = false;
				note(name, body.holder, body.code, got, runner);
			}
			if (same) count.equal++;
		}
		const report = [
			`cases ${cases}; executors: vm${zig ? ', wfrt' : ''}, host, task runner; equal ${count.equal}; refused ${count.refused}; host differs ${count.hostDiffers}`,
			`  helpers of the native forms: ${[...helpers].sort().join(' ')}`,
			...[...refused].sort((a, b) => b[1] - a[1]).map(([f, c]) => `  refused ${c}: ${f}`),
			...[...wrong].map(([key, w]) => `  WRONG ${w.count}: ${key}\n    ${w.text}`),
		].join('\n');
		if (process.env.WF_DATE_REPORT) writeFileSync(process.env.WF_DATE_REPORT, `${report}\n`);
		else if (process.env.WF_DATE_CASES || wrong.size > 0) console.log(report);
		expect([...wrong.keys()]).toEqual([]);
		expect(count.equal).toBeGreaterThan(0);
	}, 3_600_000);
});
