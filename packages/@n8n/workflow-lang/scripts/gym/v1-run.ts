/**
 * Run (a): one workflow on n8n's v1 engine (`WorkflowExecute` of n8n-core,
 * through `oracle-engine.ts`) with the gym credentials. `gym-diff.ts` starts
 * it as a child process with `NODE_OPTIONS=--require=<resolve.cjs>` and
 * `NODE_EXTRA_CA_CERTS`, so vendor host names reach the gym.
 *
 *   node scripts/gym/v1-run.ts <job.json> <result.json>
 *
 * The job file holds credential data, so it lives in the run's temp folder.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import type { TriggerChoice } from '../../src/convert/__tests__/behaviour/compare.ts';
import type { OracleWorkflow } from '../../src/convert/__tests__/behaviour/oracle-engine.ts';
import { runOracle } from '../../src/convert/__tests__/behaviour/oracle-engine.ts';
import { packageRoot } from './sample.ts';
import { gymCredentialsHelper, resolveCredentialData } from './v1-credentials.ts';

export interface V1Job {
	workflow: OracleWorkflow;
	callees: Record<string, unknown>;
	trigger: TriggerChoice;
	/** Credential data from the gym, by n8n credential type. */
	credentials: Record<string, Record<string, unknown>>;
	timeoutMs: number;
	/** The execution id, the same as the compiled run's, so `$execution.id` and resume URLs agree. */
	executionId?: string;
}

export interface V1Result {
	error: string | null;
	nodes: Record<string, unknown[][]>;
	order: string[];
	responses: unknown[];
	waiting?: boolean;
	/** The data that the run gave each credential type (defaults and expressions resolved). */
	credentials: Record<string, Record<string, unknown>>;
	startedAt: number;
	finishedAt: number;
	crash?: string;
}

let nodeTypesInstance: unknown;

/** One set of node types for the process, so a worker loads each node class once. */
function hostNodeTypes(): unknown {
	if (nodeTypesInstance !== undefined) return nodeTypesInstance;
	const dist = join(packageRoot, '..', 'workflow-fallback-host', 'dist');
	const mod: unknown = createRequire(join(dist, 'index.js'))(join(dist, 'node-types.js'));
	const ctor: unknown = Reflect.get(Object(mod), 'HostNodeTypes');
	if (typeof ctor !== 'function') throw new Error('HostNodeTypes is missing');
	nodeTypesInstance = Reflect.construct(ctor, []);
	return nodeTypesInstance;
}

/** Runs the job in `jobFile` and writes the result to `outFile`. */
async function runJob(jobFile: string, outFile: string): Promise<void> {
	const job: V1Job = JSON.parse(readFileSync(jobFile, 'utf8'));
	const startedAt = Date.now();
	const resolved: Record<string, Record<string, unknown>> = {};
	let result: V1Result;
	try {
		const byType = new Map<string, Record<string, unknown>>();
		for (const [type, data] of Object.entries(job.credentials)) {
			resolved[type] = resolveCredentialData(type, data);
			byType.set(type, resolved[type]);
		}
		const oracle = await runOracle(job.workflow, {
			start: job.trigger.start,
			item: job.trigger.item,
			mode: job.trigger.mode,
			resolveWorkflow: (id) => job.callees[id],
			timeoutMs: job.timeoutMs,
			executionId: job.executionId,
			nodeTypes: hostNodeTypes(),
			additionalData: { credentialsHelper: gymCredentialsHelper(byType) },
			withBinary: true,
		});
		result = { ...oracle, credentials: resolved, startedAt, finishedAt: Date.now() };
	} catch (e) {
		result = {
			error: null,
			nodes: {},
			order: [],
			responses: [],
			credentials: resolved,
			startedAt,
			finishedAt: Date.now(),
			crash: e instanceof Error ? `${e.name}: ${e.message}` : String(e),
		};
	}
	writeFileSync(outFile, JSON.stringify(result));
}

function isJobMessage(m: unknown): m is { jobFile: string; outFile: string } {
	return (
		typeof m === 'object' &&
		m !== null &&
		typeof Reflect.get(m, 'jobFile') === 'string' &&
		typeof Reflect.get(m, 'outFile') === 'string'
	);
}

if (process.send) {
	process.on('disconnect', () => process.exit(0));
	// Worker mode (`v1-pool.ts`): one job at a time over IPC; the parent ends a job that hangs.
	process.on('message', (m: unknown) => {
		if (!isJobMessage(m)) return;
		void runJob(m.jobFile, m.outFile)
			.catch((e: unknown) => process.stderr.write(`v1-run: ${String(e)}\n`))
			.finally(() => process.send?.({ done: m.outFile }));
	});
} else {
	const [jobFile, outFile] = process.argv.slice(2);
	void runJob(jobFile, outFile)
		.then(() => process.exit(0))
		.catch((e: unknown) => {
			process.stderr.write(`v1-run: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}\n`);
			process.exit(2);
		});
}
