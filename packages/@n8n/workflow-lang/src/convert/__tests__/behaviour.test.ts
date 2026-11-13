/**
 * Behaviour cases: each workflow in `behaviour/cases/` is converted, run on
 * the reference runner, and compared with `expected.json`, which
 * `behaviour/oracle.ts` wrote by running the original JSON in n8n's engine.
 *
 * HTTP Request steps get the answers of `case.json`. Code steps run in the
 * code runner of the fallback host (`runCodeStep`), and node steps run in its
 * v1 node runner (`NodeStepRunner`), so their results come from the converted
 * code, not from a fixture.
 */
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';

import type { EffectRecord, Fixture } from '../../reference/runner.ts';
import { runReference } from '../../reference/runner.ts';
import { convertWorkflow } from '../index.ts';
import type { BehaviourCase } from './behaviour/case.ts';

const here = dirname(fileURLToPath(import.meta.url));
const casesDir = join(here, 'behaviour', 'cases');
const hostSource = join(here, '../../../../workflow-fallback-host/src');
const codeStepModule = join(hostSource, 'code-step.ts');
// The node runner loads n8n-core, which needs one CommonJS copy of n8n-workflow.
// Node's own `require` of the built host gives that; a Vite import would not.
const nodeStepModule = join(hostSource, '../dist/node-step.js');

interface Expected {
	error: string | null;
	order: string[];
	nodes: Record<string, unknown[][]>;
	requests: Array<{ path: string; method: string; body?: unknown }>;
	responses: Array<{ body: unknown; statusCode: number }>;
}

type RunCodeStep = (args: { name: string; code: string; items: unknown[] }) => unknown[];

type RunNodeStep = (args: unknown, meta: { step: string; key: string }) => Promise<unknown[]>;

async function loadCodeRunner(): Promise<RunCodeStep> {
	const mod = (await import(codeStepModule)) as { runCodeStep: RunCodeStep };
	return mod.runCodeStep;
}

let nodeRunner: RunNodeStep | undefined;

let userFolder: string | undefined;

afterAll(() => {
	if (userFolder) rmSync(userFolder, { recursive: true, force: true });
});

/** The v1 node runner of the fallback host, loaded on first use (it loads n8n-core). */
async function loadNodeRunner(): Promise<RunNodeStep> {
	if (nodeRunner) return nodeRunner;
	// n8n-core writes its settings to the user folder; the test uses its own.
	userFolder ??= mkdtempSync(join(tmpdir(), 'wf-convert-test-'));
	process.env.N8N_USER_FOLDER = userFolder;
	const mod = createRequire(import.meta.url)(nodeStepModule) as {
		NodeStepRunner: new (o: unknown) => { run: RunNodeStep };
		parseNodeStepArgs: (a: unknown) => unknown;
	};
	const runner = new mod.NodeStepRunner({ credentials: { get: async () => ({}) } });
	nodeRunner = async (args, meta) => await runner.run(mod.parseNodeStepArgs(args), meta);
	return nodeRunner;
}

const read = <T>(file: string): T => JSON.parse(readFileSync(file, 'utf8')) as T;

/** Runs the converted source; code steps get their result from the fallback host's code runner. */
async function run(source: string, spec: BehaviourCase, schedule: boolean) {
	const runCode = await loadCodeRunner();
	const effects: Record<string, unknown[]> = {};
	for (const [step, http] of Object.entries(spec.http ?? {})) {
		effects[step] = http.responses.map((r) =>
			(r.status ?? 200) >= 400
				? { $error: `Request failed with status code ${r.status}` }
				: {
						status: r.status ?? 200,
						// The oracle's server answers JSON; the library node reads the content type.
						headers: typeof r.body === 'string' ? {} : { 'content-type': 'application/json' },
						body: r.body,
					},
		);
	}
	const fixture: Fixture = {
		trigger: schedule
			? { scheduledAt: spec.trigger.scheduledAt }
			: {
					body: spec.trigger.body,
					headers: spec.trigger.headers ?? {},
					query: spec.trigger.query ?? {},
				},
		now: 1_700_000_000_000,
		seed: 1,
		effects,
	};
	for (let round = 0; round < 20; round++) {
		const out = await runReference(source, fixture);
		const seen = new Map<string, number>();
		let added = false;
		for (const e of out.effects) {
			const k = seen.get(e.step) ?? 0;
			seen.set(e.step, k + 1);
			if (e.kind !== 'code' && e.kind !== 'node') continue;
			const list = (effects[e.step] ??= []);
			if (list[k] !== undefined) continue;
			const args = e.args as { name: string; code: string; items: unknown[] };
			try {
				list[k] =
					e.kind === 'code'
						? runCode({ name: args.name, code: args.code, items: args.items ?? [] })
						: await (await loadNodeRunner())(e.args, { step: e.step, key: `${e.step}-${k}` });
			} catch (error) {
				list[k] = { $error: error instanceof Error ? error.message : String(error) };
			}
			added = true;
			break;
		}
		if (!added) return out;
	}
	throw new Error('code steps did not settle');
}

function requestsOf(effects: EffectRecord[]) {
	return effects
		.filter((e) => e.kind === 'http')
		.map((e) => {
			const args = e.args as { method: string; url: string; body?: unknown };
			const url = new URL(args.url);
			return { path: `${url.pathname}${url.search}`, method: args.method, body: args.body };
		});
}

const cases = readdirSync(casesDir).sort();

describe('converted workflows behave as in n8n', () => {
	it('has at least 8 cases', () => {
		expect(cases.length).toBeGreaterThanOrEqual(8);
	});

	for (const name of cases) {
		it(name, async () => {
			const dir = join(casesDir, name);
			const workflow = read<{ nodes: Array<{ type: string; name: string }> }>(
				join(dir, 'workflow.json'),
			);
			const spec = read<BehaviourCase>(join(dir, 'case.json'));
			const expected = read<Expected>(join(dir, 'expected.json'));
			const converted = convertWorkflow(workflow);
			const errors = converted.diagnostics.filter((d) => d.severity === 'error');
			expect(errors).toEqual([]);
			const schedule = workflow.nodes.some((n) => n.type === 'n8n-nodes-base.scheduleTrigger');
			const out = await run(converted.source, spec, schedule);
			expect(out.status, JSON.stringify(out.result)).toBe('ok');
			expect(expected.error).toBeNull();

			// Each node that the converted run returns (the leaves) has the items that n8n gave.
			const result = out.result as Record<string, unknown[]>;
			const leaves = spec.compare ?? Object.keys(result);
			expect(leaves.length).toBeGreaterThan(0);
			for (const leaf of leaves) {
				expect(result[leaf], `output of ${leaf}`).toEqual(expected.nodes[leaf]?.[0] ?? []);
			}

			// The same HTTP requests, in the same order.
			const requests = requestsOf(out.effects);
			expect(requests.map((r) => `${r.method} ${r.path}`)).toEqual(
				expected.requests.map((r) => `${r.method} ${r.path}`),
			);
			requests.forEach((r, k) => {
				if (r.method !== 'GET') expect(r.body).toEqual(expected.requests[k].body);
			});

			// The same webhook responses.
			const responses = out.effects
				.filter((e) => e.kind === 'respond')
				.map((e) => e.args as { status?: number; body: unknown });
			expect(responses.map((r) => ({ statusCode: r.status ?? 200, body: r.body }))).toEqual(
				expected.responses.map((r) => ({ statusCode: r.statusCode, body: r.body })),
			);

			// Steps run in the order in which n8n ran their nodes. Steps that are not nodes
			// (the wait between retries of a node) are left out.
			const nodeNames = new Set(workflow.nodes.map((n) => n.name));
			const stepOrder = [
				...new Set(out.effects.map((e) => e.step).filter((step) => nodeNames.has(step))),
			];
			// The first run of each node counts: a node in a loop runs more than once.
			expect(stepOrder).toEqual([...new Set(expected.order.filter((n) => stepOrder.includes(n)))]);
		});
	}
});
