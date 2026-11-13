/**
 * Runs one eligible workflow on both engines against the gym and compares
 * the results. See `scripts/gym-diff.ts` for the whole flow.
 *
 * 1. Seed a tenant with the example worlds of the workflow's services, get
 *    the credentials, and bind the workflow's ids to the world (`binding.ts`).
 * 2. Take a snapshot of the tenant.
 * 3. Run (a) on n8n's v1 engine in a child process, then read the state.
 * 4. Restore the snapshot into the same tenant id, so (b) starts from the same
 *    state with the same ids and credentials.
 * 5. Run (b) on `wfrt` and the fallback host, then read the state.
 * 6. Compare the node outputs and the states (`normalize.ts`).
 */
import { spawn } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { TriggerChoice } from '../../src/convert/__tests__/behaviour/compare.ts';
import { triggerFor } from '../../src/convert/__tests__/behaviour/compare.ts';
import type { OracleWorkflow } from '../../src/convert/__tests__/behaviour/oracle-engine.ts';
import { compile } from '../../src/compiler/index.ts';
import { convertWorkflow, formatConvertDiagnostic } from '../../src/convert/index.ts';
import { bindWorkflow } from './binding.ts';
import type { CredentialData } from './credentials.ts';
import { credentialsDocument, gymCredentials } from './credentials.ts';
import type { Classification } from './eligibility.ts';
import { credentialTypeOf } from './eligibility.ts';
import type { GymAdmin } from './gym-admin.ts';
import type { Difference } from './normalize.ts';
import { brief, Normalizer, trimOutputs } from './normalize.ts';
import type { JsonRecord, Sample } from './sample.ts';
import { isRecord, mainTrigger, nodesOf, packageRoot } from './sample.ts';
import type { V1Pool } from './v1-pool.ts';
import type { V1Job, V1Result } from './v1-run.ts';
import type { WfrtClient, WfrtEvent } from './wfrt.ts';
import { traceNodes } from './wfrt.ts';
import { seedTenant } from './world.ts';

export interface RunContext {
	gym: GymAdmin;
	wfrt: WfrtClient;
	/** Environment of Node.js processes that reach the gym (resolve.cjs, the CA). */
	nodeEnv: NodeJS.ProcessEnv;
	work: string;
	runId: string;
	timeoutMs: number;
	keepTenants: boolean;
	v1: V1Pool;
}

/** `equal`, `setup failed`, `convert failed`, or the parts that differ: `status`, `outputs`, `state`. */
export type Outcome = string;

export interface RunReport {
	key: string;
	n: number;
	services: string[];
	outcome: Outcome;
	v1: { ok: boolean; status: string; error: string | null; ms: number };
	compiled: { ok: boolean; status: string; error?: string; ms: number };
	nodeDiffs: Array<{ node: string; diffs: Difference[] }>;
	stateDiffs: Difference[];
	normalized: { time: number; id: number };
	bindings: string[];
	unbound: string[];
	seedWarnings: string[];
	/** Credential types that the gym did not give. */
	missingCredentials: string[];
	note?: string;
	log: string;
}

function calleesOf(
	wf: JsonRecord,
	resolve: (id: string) => JsonRecord | undefined,
): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	const visit = (w: JsonRecord, depth: number) => {
		if (depth > 5) return;
		for (const n of nodesOf(w)) {
			if (n.type !== 'n8n-nodes-base.executeWorkflow') continue;
			const raw = n.parameters?.workflowId;
			const id = (
				typeof raw === 'string'
					? raw
					: isRecord(raw) && (typeof raw.value === 'string' || typeof raw.value === 'number')
						? String(raw.value)
						: ''
			).replace(/^=/, '');
			if (!id || id in out) continue;
			const callee = resolve(id);
			if (callee) {
				out[id] = callee;
				visit(callee, depth + 1);
			}
		}
	};
	visit(wf, 0);
	return out;
}

/** The node credentials point at one credential for each type, so both engines use the gym data. */
function withCredentials(wf: JsonRecord): { workflow: JsonRecord; types: string[] } {
	const types = new Set<string>();
	const nodes = nodesOf(wf).map((n) => {
		const type = credentialTypeOf(n);
		if (!type) return n;
		types.add(type);
		return { ...n, credentials: { [type]: { id: `gym-${type}`, name: `gym ${type}` } } };
	});
	return { workflow: { ...wf, nodes }, types: [...types] };
}

async function runV1(ctx: RunContext, dir: string, job: V1Job): Promise<V1Result> {
	const jobFile = join(dir, 'v1-job.json');
	const outFile = join(dir, 'v1-result.json');
	writeFileSync(jobFile, JSON.stringify(job));
	const started = Date.now();
	const ok = await ctx.v1.run(jobFile, outFile, ctx.timeoutMs + 15_000);
	if (ok && existsSync(outFile)) {
		const parsed: V1Result = JSON.parse(readFileSync(outFile, 'utf8'));
		return parsed;
	}
	return {
		error: null,
		nodes: {},
		order: [],
		responses: [],
		credentials: {},
		startedAt: started,
		finishedAt: Date.now(),
		crash: 'timeout (the worker was killed)',
	};
}

async function diagnoseStep(
	ctx: RunContext,
	dir: string,
	step: string,
	args: JsonRecord,
	credentials: unknown,
): Promise<string> {
	const stepFile = join(dir, 'diag-step.json');
	const outFile = join(dir, 'diag-result.json');
	writeFileSync(stepFile, JSON.stringify({ step, args, credentials }));
	const child = spawn(
		process.execPath,
		[join(packageRoot, 'scripts', 'gym', 'host-step.ts'), stepFile, outFile],
		{
			env: ctx.nodeEnv,
			stdio: 'ignore',
		},
	);
	await new Promise<void>((resolve) => {
		const timer = setTimeout(() => child.kill('SIGKILL'), ctx.timeoutMs);
		child.on('exit', () => {
			clearTimeout(timer);
			resolve();
		});
	});
	if (!existsSync(outFile)) return 'no result';
	const out: unknown = JSON.parse(readFileSync(outFile, 'utf8'));
	if (!isRecord(out)) return 'no result';
	return out.ok === true ? 'the step succeeds when it runs again' : String(out.error);
}

/** `ok`, `waiting` (for a resume) or `failed` (an error, needs attention, a limit or a timeout). */
function statusClass(status: string): string {
	return status === 'ok' || status === 'waiting' ? status : 'failed';
}

function oracleWorkflow(wf: JsonRecord): OracleWorkflow {
	return {
		id: typeof wf.id === 'string' ? wf.id : undefined,
		name: typeof wf.name === 'string' ? wf.name : undefined,
		nodes: nodesOf(wf),
		connections: wf.connections ?? {},
		settings: wf.settings,
	};
}

function errorText(e: unknown): string {
	return e instanceof Error ? e.message : String(e);
}

export async function runOne(
	ctx: RunContext,
	sample: Sample,
	n: number,
	cls: Classification,
	resolve: (id: string) => JsonRecord | undefined,
): Promise<RunReport> {
	const dir = join(ctx.work, 'runs', String(n));
	mkdirSync(dir, { recursive: true });
	const logFile = join(dir, 'run.log');
	const log = (line: string) => appendFileSync(logFile, `${new Date().toISOString()} ${line}\n`);
	const report: RunReport = {
		key: sample.key,
		n,
		services: cls.services,
		outcome: 'setup failed',
		v1: { ok: false, status: 'not run', error: null, ms: 0 },
		compiled: { ok: false, status: 'not run', ms: 0 },
		nodeDiffs: [],
		stateDiffs: [],
		normalized: { time: 0, id: 0 },
		bindings: [],
		unbound: [],
		seedWarnings: [],
		missingCredentials: [],
		log: logFile,
	};
	log(`workflow ${sample.key}; services ${cls.services.join(', ') || 'none'}`);
	const tenant = `gd-${ctx.runId}-${n}`;
	const workflowId = `gd-${n}`;
	// One execution id for both runs, so `$execution.id` and resume URLs agree.
	const executionId = String(100_000 + n);
	try {
		// 1. Seed, credentials, bindings.
		// A workflow without external calls needs no tenant: its state is empty in both runs.
		const useGym = cls.services.length > 0;
		const seeded = useGym
			? await seedTenant(ctx.gym, tenant, cls.services)
			: { tenant: {}, warnings: [] };
		report.seedWarnings = seeded.warnings;
		for (const w of seeded.warnings) log(`seed warning: ${w}`);
		const bound = bindWorkflow(sample.workflow, seeded.tenant);
		report.bindings = bound.bindings;
		report.unbound = bound.unbound;
		for (const b of bound.bindings) log(`bind: ${b}`);
		for (const u of bound.unbound) log(`not bound: ${u}`);
		const callees = calleesOf(bound.workflow, resolve);
		const { workflow, types } = withCredentials(bound.workflow);
		const boundCallees: Record<string, unknown> = {};
		const calleeTypes: string[] = [];
		for (const [id, c] of Object.entries(callees)) {
			if (!isRecord(c)) continue;
			const w = withCredentials(c);
			boundCallees[id] = w.workflow;
			calleeTypes.push(...w.types);
		}
		const creds = useGym
			? await gymCredentials(ctx.gym, tenant, seeded.tenant, cls.services, [
					...types,
					...calleeTypes,
				])
			: { byType: {}, missing: [...types, ...calleeTypes] };
		log(`credential types: ${Object.keys(creds.byType).join(', ') || 'none'}`);
		if (creds.missing.length > 0)
			log(`credential types the gym did not give: ${creds.missing.join(', ')}`);
		report.missingCredentials = useGym ? creds.missing : [];
		writeFileSync(join(dir, 'workflow.json'), JSON.stringify(workflow, null, 2));

		// 2. Snapshot.
		const snapshot = useGym ? await ctx.gym.snapshot(tenant) : '';

		// 3. Run (a).
		const trigger = mainTrigger(workflow);
		if (!trigger) throw new Error('no trigger');
		const choice: TriggerChoice = triggerFor(trigger);
		const v1 = await runV1(ctx, dir, {
			workflow: oracleWorkflow(workflow),
			callees: boundCallees,
			trigger: choice,
			credentials: creds.byType,
			timeoutMs: ctx.timeoutMs,
			executionId,
		});
		const v1Ok = !v1.crash && v1.error === null;
		report.v1 = {
			ok: v1Ok && !v1.waiting,
			status: v1.crash ? 'crash' : v1.error !== null ? 'error' : v1.waiting ? 'waiting' : 'ok',
			error: v1.crash ?? v1.error,
			ms: v1.finishedAt - v1.startedAt,
		};
		log(
			`v1: ${v1.crash ? `crash ${v1.crash}` : v1.error ? `error ${v1.error}` : 'ok'} in ${report.v1.ms} ms`,
		);
		const stateA = useGym ? await ctx.gym.state(tenant) : {};
		const windowA = { start: v1.startedAt, end: v1.finishedAt };

		// 4. Restore.
		if (useGym) {
			await ctx.gym.deleteTenant(tenant);
			await ctx.gym.restore(tenant, snapshot);
		}

		// 5. Run (b).
		const converted = convertWorkflow(workflow, {
			name: sample.file.replace(/^.*\//, '').replace(/\.json$/, ''),
			resolveWorkflow: (id) => boundCallees[id],
			trace: 'all',
		});
		for (const d of converted.diagnostics)
			if (d.severity === 'error') log(`convert: ${formatConvertDiagnostic(d)}`);
		writeFileSync(join(dir, 'workflow.ts'), converted.source);
		if (!converted.ok) {
			report.outcome = 'convert failed';
			return report;
		}
		const compiled = compile(converted.source, { fileName: '/workflow.ts' });
		if (!compiled.ok || !compiled.module) {
			report.outcome = 'convert failed';
			log(`compile failed: ${compiled.diagnostics.map((d) => d.message).join('; ')}`);
			return report;
		}
		// The data that run (a) gave each type (defaults and `$self` resolved), as n8n's
		// compiled-engine module builds it with the credentials helper.
		const resolved: Record<string, CredentialData> = { ...creds.byType, ...v1.credentials };
		const doc = credentialsDocument(converted.credentials ?? {}, resolved);
		if (doc.missing.length > 0) log(`slots without data: ${doc.missing.join(', ')}`);
		await ctx.wfrt.putWorkflow(workflowId, {
			versionId: `v${n}`,
			module: Buffer.from(compiled.module).toString('base64'),
			active: false,
			webhookPrefix: '/webhook',
			credentials: doc.file,
			// The bases that the v1 run uses (`oracle-engine.ts`), as n8n gives its own.
			resumeUrlBase: 'http://localhost/webhook-waiting',
			resumeFormUrlBase: 'http://localhost/form-waiting',
		});
		const startedB = Date.now();
		const run = await ctx.wfrt.run(workflowId, executionId, choice.fixture, ctx.timeoutMs);
		const endedB = Date.now();
		await ctx.wfrt.deleteWorkflow(workflowId);
		writeFileSync(join(dir, 'events.jsonl'), run.events.map((e) => JSON.stringify(e)).join('\n'));
		const end: WfrtEvent | undefined = run.end;
		const status = end ? (end.type === 'waiting' ? 'waiting' : String(end.status)) : 'timeout';
		const failed = run.events.find((e) => e.type === 'step' && e.status === 'failed');
		const resultError =
			end && isRecord(end.result) && typeof end.result.message === 'string'
				? end.result.message
				: undefined;
		report.compiled = {
			ok: status === 'ok',
			status,
			error: typeof failed?.error === 'string' ? failed.error : resultError,
			ms: endedB - startedB,
		};
		log(
			`compiled: ${status}${report.compiled.error ? ` ${report.compiled.error}` : ''} in ${report.compiled.ms} ms`,
		);
		const stateB = useGym ? await ctx.gym.state(tenant) : {};
		// `wfrt` sends no `failed` event before `needs_attention`: re-run the step in the
		// host's node runner to read its error. The state is read already.
		if (
			status === 'needs_attention' &&
			end &&
			typeof end.step === 'string' &&
			!report.compiled.error
		) {
			const startedStep = [...run.events]
				.reverse()
				.find((e) => e.type === 'step' && e.step === end.step && e.status === 'started');
			if (
				startedStep &&
				isRecord(startedStep.args) &&
				(typeof startedStep.args.type === 'string' || typeof startedStep.args.code === 'string')
			) {
				report.compiled.error = `(step re-run) ${await diagnoseStep(ctx, dir, end.step, startedStep.args, doc.file)}`;
			} else if (startedStep && isRecord(startedStep.args)) {
				report.compiled.error = `(http step ${String(startedStep.args.method)} ${String(startedStep.args.url)})`;
			}
			log(`compiled step error: ${report.compiled.error ?? ''}`);
		}

		// 6. Compare.
		const norm = new Normalizer(
			windowA,
			{ start: startedB, end: endedB },
			`${JSON.stringify(workflow)}\n${snapshot}`,
		);
		const actual = traceNodes(run.events);
		// Rule 6: when both runs wait at the same node, v1 keeps a run of that node (its input
		// items) and the compiled run has no trace of it before the resume.
		const waitStep = end?.type === 'waiting' && typeof end.step === 'string' ? end.step : undefined;
		if (report.v1.status === 'waiting' && waitStep && actual[waitStep] === undefined) {
			delete v1.nodes[waitStep];
			log(`left out the v1 run of "${waitStep}", where both runs wait`);
		}
		const own = new Set(nodesOf(workflow).map((x) => x.name));
		const names = [...new Set([...Object.keys(v1.nodes), ...Object.keys(actual)])].filter((x) =>
			own.has(x),
		);
		for (const name of names.sort()) {
			const diffs = norm.diff(trimOutputs(v1.nodes[name]), trimOutputs(actual[name]), name);
			if (diffs.length > 0) report.nodeDiffs.push({ node: name, diffs: diffs.slice(0, 20) });
		}
		report.stateDiffs = norm.diff(stateA, stateB, 'state').slice(0, 50);
		report.normalized = { ...norm.stats };
		writeFileSync(join(dir, 'state-a.json'), JSON.stringify(stateA, null, 1));
		writeFileSync(join(dir, 'state-b.json'), JSON.stringify(stateB, null, 1));
		writeFileSync(
			join(dir, 'nodes.json'),
			JSON.stringify({ v1: v1.nodes, compiled: actual }, null, 1),
		);
		// Both succeed, or both stop at an error (v1 error, compiled error or needs_attention).
		const parts = [
			statusClass(report.v1.status) !== statusClass(report.compiled.status) ? 'status' : '',
			report.nodeDiffs.length > 0 ? 'outputs' : '',
			report.stateDiffs.length > 0 ? 'state' : '',
		].filter(Boolean);
		report.outcome = parts.length === 0 ? 'equal' : parts.join(', ');
		for (const d of report.nodeDiffs) {
			log(
				`node ${d.node}: ${d.diffs.map((x) => `${x.path} ${brief(x.a)} / ${brief(x.b)}`).join('; ')}`,
			);
		}
		for (const d of report.stateDiffs) log(`state ${d.path}: ${brief(d.a)} / ${brief(d.b)}`);
		log(`outcome: ${report.outcome}`);
	} catch (e) {
		report.note = errorText(e);
		log(`setup failed: ${report.note}`);
	} finally {
		await ctx.wfrt.deleteWorkflow(workflowId);
		if (!ctx.keepTenants && cls.services.length > 0)
			await ctx.gym.deleteTenant(tenant).catch(() => undefined);
	}
	return report;
}
