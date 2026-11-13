/**
 * Runs converted workflows on the reference runner and compares them with
 * n8n's engine (`oracle-engine.ts`). `scripts/convert-coverage.ts` uses it.
 *
 * - `smokeRun` gives each step a synthetic result: node and code steps give
 *   their input items back, HTTP gives `{ status: 200, body: {} }`, an
 *   approval gives `{ approved: true, data: {} }`.
 * - `oracleRun` gives code steps the result of the fallback host's code
 *   runner and node steps the result of its v1 node runner, so the results
 *   come from the converted code. It reads the output of each node from the
 *   `ctx.trace` calls (convert with `trace: 'all'`).
 *
 * The reference runner takes a fixture with fixed results, so a step result
 * that depends on the step's arguments needs one more run: each run adds the
 * result of the first step that has none, until no step is missing.
 */
import { mkdtempSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

import type { EffectRecord, Fixture, ReferenceOutput } from '../../../reference/runner.ts';
import { jsonCopy, runReference } from '../../../reference/runner.ts';
import type { OracleResult, OracleWorkflow } from './oracle-engine.ts';
import { runOracle } from './oracle-engine.ts';

const here = dirname(fileURLToPath(import.meta.url));
const hostDist = join(here, '../../../../../workflow-fallback-host/dist');

type Resolver = (e: EffectRecord, occurrence: number) => Promise<unknown>;

export const NOW = 1_700_000_000_000;

/** Runs a converted source until every step has a result. */
export async function settle(
	source: string,
	trigger: unknown,
	resolve: Resolver,
	maxRounds = 400,
): Promise<{ out: ReferenceOutput; rounds: number; settled: boolean }> {
	const effects: Record<string, unknown[]> = {};
	const fixture: Fixture = { trigger, now: NOW, seed: 1, effects, trace: true };
	let out = await runReference(source, fixture);
	for (let round = 0; round < maxRounds; round++) {
		const seen = new Map<string, number>();
		let missing: { e: EffectRecord; k: number } | null = null;
		for (const e of out.effects) {
			const k = seen.get(e.step) ?? 0;
			seen.set(e.step, k + 1);
			if ((effects[e.step] ?? [])[k] === undefined && e.kind !== 'wait' && e.kind !== 'respond') {
				missing = { e, k };
				break;
			}
		}
		if (!missing) return { out, rounds: round, settled: true };
		const list = (effects[missing.e.step] ??= []);
		let result: unknown;
		try {
			result = await resolve(missing.e, missing.k);
		} catch (error) {
			result = { $error: error instanceof Error ? error.message : String(error) };
		}
		list[missing.k] = result === undefined ? null : result;
		out = await runReference(source, fixture);
	}
	return { out, rounds: maxRounds, settled: false };
}

function argsOf(e: EffectRecord): Record<string, unknown> {
	return typeof e.args === 'object' && e.args !== null && !Array.isArray(e.args)
		? (e.args as Record<string, unknown>)
		: {};
}

/** Synthetic step results for the smoke run. */
export const smokeResolver: Resolver = async (e) => {
	const args = argsOf(e);
	switch (e.kind) {
		case 'node':
		case 'code':
			return Array.isArray(args.items) ? args.items : [{}];
		case 'http':
			return { status: 200, headers: {}, body: {} };
		case 'approval':
			return { approved: true, data: {} };
		default:
			return null;
	}
};

type RunCodeStep = (args: { name: string; code: string; items: unknown[] }) => unknown;
type RunNodeStep = (args: unknown, meta: { step: string; key: string }) => Promise<unknown>;

let runners: { code: RunCodeStep; node: RunNodeStep } | undefined;

/** The code and node runners of the built fallback host. */
export function hostRunners(): { code: RunCodeStep; node: RunNodeStep } {
	if (runners) return runners;
	process.env.N8N_USER_FOLDER ??= mkdtempSync(join(tmpdir(), 'wf-convert-coverage-'));
	const req = createRequire(join(hostDist, 'index.js'));
	const codeMod = req(join(hostDist, 'code-step.js')) as {
		runCodeStep: RunCodeStep;
		parseCodeStepArgs: (a: unknown) => { name: string; code: string; items: unknown[] };
	};
	const nodeMod = req(join(hostDist, 'node-step.js')) as {
		NodeStepRunner: new (o: unknown) => { run: RunNodeStep };
		parseNodeStepArgs: (a: unknown) => unknown;
	};
	const node = new nodeMod.NodeStepRunner({ credentials: { get: async () => ({}) } });
	runners = {
		code: (args) => codeMod.runCodeStep(codeMod.parseCodeStepArgs(args)),
		node: async (args, meta) => await node.run(nodeMod.parseNodeStepArgs(args), meta),
	};
	return runners;
}

/** Step results from the fallback host, for the oracle comparison. */
export const hostResolver: Resolver = async (e, k) => {
	const r = hostRunners();
	switch (e.kind) {
		case 'code':
			return await r.code(argsOf(e) as { name: string; code: string; items: unknown[] });
		case 'node':
			return await r.node(e.args, { step: e.step, key: `${e.step}-${k}` });
		default:
			return await smokeResolver(e, k);
	}
};

/** The output lists of each node from the trace: one list for each output, all runs joined. */
export function traceOutputs(out: ReferenceOutput): Record<string, unknown[][]> {
	const nodes: Record<string, unknown[][]> = {};
	for (const t of out.trace ?? []) {
		// One output: the item list. Several outputs: one list for each output.
		const raw = Array.isArray(t.items) ? t.items : [];
		const lists = raw.length > 0 && raw.every((x: unknown) => Array.isArray(x)) ? raw : [raw];
		const outputs = (nodes[t.step] ??= []);
		lists.forEach((list: unknown, k: number) => {
			outputs[k] = [...(outputs[k] ?? []), ...(Array.isArray(list) ? list : [])];
		});
	}
	return nodes;
}

export interface TriggerChoice {
	/** The value of `trigger` for the converted run. */
	fixture: unknown;
	/** The start node and item of the oracle run. */
	start: string;
	item: unknown;
	mode: 'webhook' | 'trigger';
}

/** The same trigger event for the converted run and the oracle. */
export function triggerFor(trigger: { name: string; type: string }): TriggerChoice {
	if (trigger.type === 'n8n-nodes-base.webhook') {
		return {
			fixture: { body: {}, headers: {}, query: {} },
			start: trigger.name,
			item: { headers: {}, params: {}, query: {}, body: {} },
			mode: 'webhook',
		};
	}
	if (
		trigger.type === 'n8n-nodes-base.scheduleTrigger' ||
		trigger.type === 'n8n-nodes-base.cron' ||
		trigger.type === 'n8n-nodes-base.interval'
	) {
		return {
			fixture: { scheduledAt: NOW },
			start: trigger.name,
			item: { scheduledAt: NOW },
			mode: 'trigger',
		};
	}
	return { fixture: { body: {} }, start: trigger.name, item: {}, mode: 'trigger' };
}

export interface NodeMismatch {
	node: string;
	expected: unknown[][] | undefined;
	actual: unknown[][] | undefined;
}

export interface Comparison {
	oracle: OracleResult;
	converted: ReferenceOutput;
	mismatches: NodeMismatch[];
}

/** Drops trailing empty outputs, so `[[a], []]` and `[[a]]` compare equal. */
function trim(lists: unknown[][] | undefined): unknown[][] {
	const out = [...(lists ?? [])];
	while (out.length > 0 && (out[out.length - 1] ?? []).length === 0) out.pop();
	return out;
}

function withoutBinary(item: unknown): unknown {
	if (typeof item !== 'object' || item === null || !('$binary' in item)) return item;
	const { $binary: _binary, ...json } = item;
	return json;
}

/** Runs the workflow in the oracle and the converted source, and compares each node's outputs. */
export async function compareWithOracle(
	workflow: OracleWorkflow,
	source: string,
	trigger: TriggerChoice,
	resolveWorkflow?: (id: string) => unknown,
): Promise<Comparison> {
	const oracle = await runOracle(workflow, {
		start: trigger.start,
		item: trigger.item,
		mode: trigger.mode,
		resolveWorkflow,
		timeoutMs: 10_000,
	});
	const { out } = await settle(source, trigger.fixture, hostResolver, 200);
	const actual = traceOutputs(out);
	const mismatches: NodeMismatch[] = [];
	// The oracle reports the nodes of the main workflow; sub-workflow nodes are not compared.
	const own = new Set(workflow.nodes.map((n) => n.name));
	const names = new Set(
		[...Object.keys(oracle.nodes), ...Object.keys(actual)].filter((n) => own.has(n)),
	);
	for (const name of names) {
		// The oracle reports only the JSON of each item, so the binary data is not compared.
		const a = trim(actual[name]).map((list) => list.map(withoutBinary));
		const e = trim(oracle.nodes[name]);
		if (!isDeepStrictEqual(jsonCopy(a), jsonCopy(e))) {
			mismatches.push({ node: name, expected: oracle.nodes[name], actual: actual[name] });
		}
	}
	return { oracle, converted: out, mismatches };
}
