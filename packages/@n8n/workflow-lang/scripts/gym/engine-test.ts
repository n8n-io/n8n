/**
 * The compiled engine as an engine of the engine test bed
 * (`verifier/data/workflows/gym/engine-test`, `harness/replay.mjs`). Load it
 * through `engine-test-adapter.mjs`:
 *
 *   node harness/replay.mjs sets/100 --engine <repo>/packages/@n8n/workflow-lang/scripts/gym/engine-test-adapter.mjs
 *
 * `execute(bundle)` converts the bundle's workflow, compiles it, loads it
 * into `wfrt` with the bundle's credentials (spec section 7), starts a manual
 * run at the bundle's trigger with trace on, and returns the summary of
 * `lib.mjs` (`summarise`) from run data in n8n's shape.
 *
 * The test bed runs the gym. The adapter starts the fallback host and `wfrt`
 * on first use (`--gym-env`, `--ca-file`), and stops them by PID when no run
 * has come for a while, so `replay.mjs` can exit.
 *
 * Environment: ENGINE_TEST_DIR (the `engine-test` folder), GYM_ADMIN
 * (default `http://127.0.0.1:47090`), GYM_DNS (`127.0.0.1:47053`),
 * GYM_PORT_MAP (`443=47443,5432=56432,3306=53306`), ENGINE_TEST_KEEP (`all`
 * keeps the scratch folder `/tmp/wfrt-<id>-*` of each bundle, `failed` keeps it
 * when the run does not succeed; by default the adapter deletes it), ENGINE_TEST_SCRATCH (the
 * folder of these scratch folders; default `/tmp`).
 */
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { compile } from '../../src/compiler/index.ts';
import { runDataTableCall } from '../../src/services/data-table.ts';
import { runDeduplicationCall } from '../../src/services/deduplication.ts';
import { convertWorkflow } from '../../src/convert/index.ts';
import type { CredentialsFile } from '../../src/credentials/build.ts';
import { buildCredentialsFile } from '../../src/credentials/build.ts';
import { credentialRegistry } from './credentials.ts';
import type { Engine } from './processes.ts';
import { GYM_ADDR, gymHosts, startEngine, stopAll } from './processes.ts';
import type { JsonRecord } from './sample.ts';
import { isRecord, packageRoot } from './sample.ts';
import { resolveCredentialData } from './v1-credentials.ts';
import type { ServiceHandler, WfrtEvent } from './wfrt.ts';
import { WfrtClient } from './wfrt.ts';

const BED =
	process.env.ENGINE_TEST_DIR ??
	join(process.env.HOME ?? '', 'work/verifier/data/workflows/gym/engine-test');
const GYM_ADMIN = process.env.GYM_ADMIN ?? 'http://127.0.0.1:47090';

/**
 * The reference n8n as nodes see it: `additionalData.instanceBaseUrl` (its
 * WEBHOOK_URL) and the instance id, which n8n derives from the encryption key
 * (`InstanceSettings.generateInstanceId`). The Slack library node links to the
 * workflow with them, as the v1 node does in the reference run.
 */
function referenceInstance(): { baseUrl: string; id: string } | undefined {
	const baseUrl = process.env.ENGINE_TEST_INSTANCE_URL ?? 'http://127.0.0.1:47678/';
	if (process.env.ENGINE_TEST_INSTANCE_ID) {
		return { baseUrl, id: process.env.ENGINE_TEST_INSTANCE_ID };
	}
	const file = join(BED, 'harness/n8n-home/.n8n/config');
	if (!existsSync(file)) return undefined;
	const config: unknown = JSON.parse(readFileSync(file, 'utf8'));
	const key =
		isRecord(config) && typeof config.encryptionKey === 'string' ? config.encryptionKey : '';
	if (key === '') return undefined;
	const id = createHash('sha256')
		.update(key.slice(Math.round(key.length / 2)))
		.digest('hex');
	return { baseUrl, id };
}
const INSTANCE = referenceInstance();

/** After this time without a run, the adapter stops `wfrt` and the host. */
const IDLE_MS = 8000;

interface Bundle {
	dir: string;
	meta: JsonRecord & { id: string; tenant: string };
	workflow: JsonRecord;
	credentials: Array<{ key: string; type: string; data: JsonRecord }>;
	resources: {
		subworkflow?: JsonRecord;
		dataTables?: Array<{ key: string; name: string; columns: string[]; rows?: JsonRecord[] }>;
	};
	run: {
		trigger: string;
		pinData?: Record<string, Array<{ json: JsonRecord }>>;
		timeoutS?: number;
	};
}

type Summarise = (wf: JsonRecord, status: string, resultData: JsonRecord) => unknown;

interface Running {
	engine: Engine;
	wfrt: WfrtClient;
}

/** The folder of the scratch, engine and data-table folders (`ENGINE_TEST_SCRATCH`, default `/tmp`). */
const SCRATCH_ROOT = process.env.ENGINE_TEST_SCRATCH ?? '/tmp';

let running: Promise<Running> | undefined;
/** The work folders of started engines (wfrt state and logs), deleted when the engine stops. */
const engineDirs: string[] = [];
const KEEP = process.env.ENGINE_TEST_KEEP ?? '';

function remove(path: string): void {
	rmSync(path, { recursive: true, force: true });
}
let active = 0;
let idle: NodeJS.Timeout | undefined;
let executionSeq = 1;
let summariseFn: Summarise | undefined;

async function summarise(wf: JsonRecord, status: string, rd: JsonRecord): Promise<unknown> {
	if (!summariseFn) {
		const lib: unknown = await import(pathToFileURL(join(BED, 'harness', 'lib.mjs')).href);
		const fn: unknown = Reflect.get(Object(lib), 'summarise');
		if (typeof fn !== 'function') throw new Error('lib.mjs has no summarise');
		summariseFn = (w, s, r) => Reflect.apply(fn, undefined, [w, s, r]);
	}
	return summariseFn(wf, status, rd);
}

async function engineUp(): Promise<Running> {
	running ??= (async () => {
		const work = mkdtempSync(join(SCRATCH_ROOT, 'wfrt-engine-test-'));
		engineDirs.push(work);
		const gymEnv: NodeJS.ProcessEnv = {
			GYM_ADDR,
			GYM_HOSTS: ['postgres.sim', 'mysql.sim', ...(await gymHosts(GYM_ADMIN))].join(','),
			GYM_DNS: process.env.GYM_DNS ?? '127.0.0.1:47053',
			GYM_PORT_MAP: process.env.GYM_PORT_MAP ?? '443=47443,5432=56432,3306=53306',
			// As the reference n8n of the test bed (`NODE_FUNCTION_ALLOW_BUILTIN='*'`, `…_EXTERNAL='*'`).
			WF_FALLBACK_CODE_ALLOW_MODULES: '*',
			// As n8n's task runner (`N8N_RUNNERS_TASK_TIMEOUT`, 300 s): code that waits with timers.
			WF_FALLBACK_CODE_TIMEOUT_MS: '300000',
			// The Data Table node reads the bundle's tables from here (host `data-table.ts`).
			WF_FALLBACK_DATA_TABLES_DIR: DATA_TABLES_DIR,
			// The test bed has no n8n database: deduplication data goes to files.
			WF_FALLBACK_DEDUPLICATION: 'file',
			// One store for the host and the service calls of this process (`serviceBackend`).
			WF_FALLBACK_DEDUPLICATION_DIR: DEDUPLICATION_DIR,
		};
		const engine = await startEngine(work, gymEnv, join(BED, 'harness', 'ca', 'ca.pem'));
		const wfrt = new WfrtClient(engine.wfrtAdmin, engine.wfrtSecret);
		wfrt.onService = await serviceBackend();
		await wfrt.open();
		return { engine, wfrt };
	})();
	return await running;
}

async function engineDown(): Promise<void> {
	const r = running;
	running = undefined;
	if (!r) return;
	(await r).wfrt.close();
	await stopAll();
	if (KEEP !== 'all') for (const dir of engineDirs.splice(0)) remove(dir);
}

process.on('exit', () => {
	void stopAll();
	if (KEEP === 'all') return;
	for (const dir of engineDirs) remove(dir);
	remove(DATA_TABLES_DIR);
	remove(DEDUPLICATION_DIR);
});

export async function setup(): Promise<void> {
	await engineUp();
	// Stop the engine also when no run comes (every bundle fails before `execute`), so the
	// replay process can exit.
	active++;
	finish();
}

const STUB_ID = 'GYM_STUB_SUBWORKFLOW';

/** The deduplication store of the host and of the service calls (spec 9.9). */
const DEDUPLICATION_DIR = mkdtempSync(join(SCRATCH_ROOT, 'wfrt-deduplication-'));

/**
 * The test bed's backend of service calls (spec 9.9): the `dataTable` and
 * `deduplication` calls run on the fallback host's file stores, the same
 * stores that the v1 nodes in the host use.
 */
async function serviceBackend(): Promise<ServiceHandler> {
	const hostDist = join(packageRoot, '..', 'workflow-fallback-host', 'dist');
	process.env.WF_FALLBACK_DEDUPLICATION_DIR = DEDUPLICATION_DIR;
	const dedupMod: unknown = await import(pathToFileURL(join(hostDist, 'deduplication.js')).href);
	const Dedup: unknown = Reflect.get(Object(dedupMod), 'FileDeduplicator');
	if (typeof Dedup !== 'function') throw new Error('the fallback host has no FileDeduplicator');
	const store: unknown = Reflect.construct(Dedup, []);
	const dedupCall =
		(name: string) =>
		async (...args: unknown[]): Promise<unknown> => {
			const fn: unknown = Reflect.get(Object(store), name);
			if (typeof fn !== 'function') throw new Error(`the deduplication store has no ${name}`);
			const out: unknown = await Reflect.apply(fn, store, args);
			return out;
		};
	const dedup = {
		checkProcessedAndRecord: dedupCall('checkProcessedAndRecord'),
		removeProcessed: dedupCall('removeProcessed'),
		clearAllProcessedItems: dedupCall('clearAllProcessedItems'),
		getProcessedDataCount: dedupCall('getProcessedDataCount'),
	};
	const file = join(hostDist, 'data-table.js');
	const mod: unknown = await import(pathToFileURL(file).href);
	const make: unknown = Reflect.get(Object(mod), 'fileDataTableProvider');
	if (typeof make !== 'function') throw new Error('the fallback host has no fileDataTableProvider');
	const provider: unknown = Reflect.apply(make, undefined, [DATA_TABLES_DIR]);
	const call = async (name: string, args: unknown[]): Promise<object> => {
		const fn: unknown = Reflect.get(Object(provider), name);
		if (typeof fn !== 'function') throw new Error(`the data-table provider has no ${name}`);
		const out: unknown = await Reflect.apply(fn, provider, args);
		return Object(out);
	};
	return async (event) => {
		const service = typeof event.service === 'string' ? event.service : '';
		if (service === 'deduplication') {
			return await runDeduplicationCall(
				dedup,
				{
					service,
					op: typeof event.op === 'string' ? event.op : '',
					args: isRecord(event.args) ? event.args : {},
				},
				typeof event.workflowId === 'string' ? event.workflowId : '',
			);
		}
		if (service !== 'dataTable') {
			return { ok: false, error: { message: `Unknown service "${service}"` } };
		}
		return await runDataTableCall(
			{
				getDataTableAggregateProxy: async () => await call('getDataTableAggregateProxy', []),
				getDataTableProxy: async (id) =>
					await call('getDataTableProxy', [undefined, undefined, id]),
			},
			{
				service,
				op: typeof event.op === 'string' ? event.op : '',
				args: isRecord(event.args) ? event.args : {},
			},
		);
	};
}

/** The folder of the data tables of every bundle, one JSON file for each table. */
const DATA_TABLES_DIR = mkdtempSync(join(SCRATCH_ROOT, 'wfrt-data-tables-'));

/**
 * Creates the bundle's data tables (`resources.dataTables`) as files of the
 * host's data-table store, and puts their ids in the workflow in place of the
 * `GYM_DATA_TABLE_<n>` keys, as the reference does with n8n's tables.
 */
function withDataTables(bundle: Bundle, files: string[]): JsonRecord {
	let text = JSON.stringify(bundle.workflow);
	// The folder can be gone when a clean-up of /tmp ran during a long replay.
	if ((bundle.resources.dataTables ?? []).length > 0)
		mkdirSync(DATA_TABLES_DIR, { recursive: true });
	for (const dt of bundle.resources.dataTables ?? []) {
		const id = `${bundle.meta.id}-${dt.key}`.replace(/[^A-Za-z0-9_-]/g, '_');
		files.push(join(DATA_TABLES_DIR, `${id}.json`));
		writeFileSync(
			join(DATA_TABLES_DIR, `${id}.json`),
			JSON.stringify({
				id,
				name: `${dt.name} ${bundle.meta.tenant}`,
				columns: dt.columns.map((name) => ({ name, type: 'string' })),
				rows: dt.rows ?? [],
			}),
		);
		text = text.replaceAll(dt.key, id);
	}
	const out: unknown = JSON.parse(text);
	return isRecord(out) ? out : bundle.workflow;
}

/** Item lists of each run of each node, from the `trace` events. */
function traceRuns(events: WfrtEvent[]): Map<string, JsonRecord[][][]> {
	const runs = new Map<string, JsonRecord[][][]>();
	for (const e of events) {
		if (e.type !== 'trace' || typeof e.step !== 'string') continue;
		// `{ $error }` and `{ $subRuns }` traces are not item lists (see `nodeErrors`, `subNodeRuns`).
		if (isRecord(e.items)) continue;
		const raw = Array.isArray(e.items) ? e.items : [];
		// null: the node ran and gave no output at all.
		const lists =
			e.items === null
				? []
				: raw.length > 0 && raw.every((x: unknown) => Array.isArray(x))
					? raw
					: [raw];
		const run = lists.map((l: unknown) => (Array.isArray(l) ? l.filter(isRecord) : []));
		runs.set(e.step, [...(runs.get(e.step) ?? []), run]);
	}
	return runs;
}

/** An item of compiled code as an n8n item: `$binary` goes to `binary`. */
function toN8nItem(json: JsonRecord): JsonRecord {
	const { $binary, ...rest } = json;
	return isRecord($binary) ? { json: rest, binary: $binary } : { json: rest };
}

interface Edge {
	from: string;
	to: string;
	kind: string;
	output: number;
	/** The input index on the target (1 for the fallback model of an agent). */
	index: number;
}

function edgesOf(wf: JsonRecord): Edge[] {
	const out: Edge[] = [];
	const conns = isRecord(wf.connections) ? wf.connections : {};
	for (const [from, types] of Object.entries(conns)) {
		if (!isRecord(types)) continue;
		for (const [kind, outputs] of Object.entries(types)) {
			if (!Array.isArray(outputs)) continue;
			outputs.forEach((list: unknown, output: number) => {
				if (!Array.isArray(list)) return;
				for (const c of list) {
					if (isRecord(c) && typeof c.node === 'string')
						out.push({
							from,
							to: c.node,
							kind,
							output,
							index: typeof c.index === 'number' ? c.index : 0,
						});
				}
			});
		}
	}
	return out;
}

/**
 * `runData` in n8n's shape. A node counts as run when it is the trigger or a
 * parent sent it items on a main connection, as v1 runs a node only then. An
 * AI sub-node counts as run (with no main output) when the node it serves ran.
 */
/**
 * The runs of the sub-nodes of AI clusters (`{ $subRuns: [{ error }] }` traces): run data
 * without main outputs, with the error of a run that failed, as v1 records them.
 */
function subNodeRuns(events: WfrtEvent[]): Map<string, JsonRecord[]> {
	const out = new Map<string, JsonRecord[]>();
	for (const e of events) {
		if (e.type !== 'trace' || typeof e.step !== 'string' || !isRecord(e.items)) continue;
		const list = e.items.$subRuns;
		if (!Array.isArray(list)) continue;
		const runs = list.filter(isRecord).map((r): JsonRecord => {
			const run: JsonRecord = { data: { main: [] } };
			if (typeof r.error === 'string') run.error = { message: r.error };
			return run;
		});
		out.set(e.step, [...(out.get(e.step) ?? []), ...runs]);
	}
	return out;
}

/**
 * The runs (indexes of item traces) that follow an `$error` trace of the same step: the
 * runs of a node that failed as a whole and went on.
 */
function errorRuns(events: WfrtEvent[]): Map<string, number[]> {
	const out = new Map<string, number[]>();
	const pending = new Set<string>();
	const count = new Map<string, number>();
	for (const e of events) {
		if (e.type !== 'trace' || typeof e.step !== 'string') continue;
		if (isRecord(e.items)) {
			if (isRecord(e.items.$error)) pending.add(e.step);
			continue;
		}
		const k = count.get(e.step) ?? 0;
		count.set(e.step, k + 1);
		if (pending.delete(e.step)) out.set(e.step, [...(out.get(e.step) ?? []), k]);
	}
	return out;
}

/** The `$error` trace just before item trace `run` of a step. */
function failedErrorAt(events: WfrtEvent[], step: string, run: number): JsonRecord {
	let k = 0;
	let error: JsonRecord = {};
	for (const e of events) {
		if (e.type !== 'trace' || e.step !== step) continue;
		if (isRecord(e.items)) {
			if (isRecord(e.items.$error)) error = e.items.$error;
			continue;
		}
		if (k === run) return error;
		k++;
	}
	return error;
}

/** The error of a node that failed in the run (`{ $error: { message, description } }` traces). */
function nodeErrors(events: WfrtEvent[]): Map<string, JsonRecord> {
	const out = new Map<string, JsonRecord>();
	for (const e of events) {
		if (e.type !== 'trace' || typeof e.step !== 'string' || !isRecord(e.items)) continue;
		if (isRecord(e.items.$error)) out.set(e.step, e.items.$error);
	}
	return out;
}

function runDataOf(wf: JsonRecord, trigger: string, events: WfrtEvent[]): JsonRecord {
	const runs = traceRuns(events);
	const subRuns = subNodeRuns(events);
	const edges = edgesOf(wf);
	const sent = (from: string, output: number) =>
		(runs.get(from) ?? []).some((run) => (run[output] ?? []).length > 0);
	const runData: JsonRecord = {};
	for (const [name, list] of runs) {
		if (subRuns.has(name)) continue;
		const fed =
			name === trigger ||
			edges.some((e) => e.kind === 'main' && e.to === name && sent(e.from, e.output));
		if (!fed) continue;
		runData[name] = list.map((outputs) => ({
			data: { main: outputs.map((items) => items.map(toN8nItem)) },
		}));
	}
	for (const [name, list] of subRuns) runData[name] = list;
	// A node that failed and went on (continue on fail): v1 has the error on its run. The
	// converted code traces the error before the items of the same run.
	const failedRuns = errorRuns(events);
	for (const [name, error] of nodeErrors(events)) {
		const list = Array.isArray(runData[name]) ? runData[name] : [];
		const marked = (failedRuns.get(name) ?? []).filter((k) => isRecord(list[k]));
		const targets =
			marked.length > 0 ? marked.map((k) => [k, failedErrorAt(events, name, k)] as const) : [];
		if (targets.length === 0) {
			const last = list[list.length - 1];
			if (isRecord(last)) targets.push([list.length - 1, error] as const);
		}
		if (targets.length === 0) {
			runData[name] = [...list, { error: { message: error.message } }];
			continue;
		}
		for (const [k, e] of targets) {
			const run = list[k];
			if (!isRecord(run)) continue;
			run.error = { message: e.message, description: e.description };
			// v1 gives the input of a node that failed and went on as its only output
			// (`nodeSuccessData = [input]`), also under "continue (using error output)".
			const data = isRecord(run.data) ? run.data : undefined;
			if (data && Array.isArray(data.main) && data.main.length > 1) data.main = [data.main[0]];
		}
	}
	// A cluster whose sub-nodes reported their runs needs no guess for the others.
	const reported = new Set(
		edgesOf(wf)
			.filter((e) => e.kind !== 'main' && subRuns.has(e.from))
			.map((e) => e.to),
	);
	// A disabled root passes its input through and does not call its sub-nodes.
	const disabled = new Set(
		(Array.isArray(wf.nodes) ? wf.nodes : [])
			.filter((n) => isRecord(n) && n.disabled === true)
			.map((n) => (isRecord(n) ? n.name : undefined)),
	);
	let changed = true;
	while (changed) {
		changed = false;
		for (const e of edges) {
			if (disabled.has(e.to) || disabled.has(e.from)) continue;
			// A tool runs only when the agent calls it, and a fallback model only when the
			// first fails: the trace does not show either, so they do not count.
			if (e.kind === 'main' || e.kind === 'ai_tool' || e.index > 0) continue;
			if (reported.has(e.to) || subRuns.has(e.to)) continue;
			if (!(e.to in runData) || e.from in runData) continue;
			// A root that failed did not reach its sub-nodes, or the host reported their runs.
			const rootRuns = runData[e.to];
			if (Array.isArray(rootRuns) && rootRuns.some((r) => isRecord(r) && 'error' in r)) continue;
			runData[e.from] = [{ data: { main: [] } }];
			changed = true;
		}
	}
	return runData;
}

function credentialsFor(
	slots: Record<string, { id: string | null; type: string }>,
	bundle: Bundle,
): CredentialsFile {
	const file: CredentialsFile = {};
	for (const [slot, { id, type }] of Object.entries(slots)) {
		const c =
			bundle.credentials.find((x) => x.key === id) ??
			bundle.credentials.find((x) => x.type === type);
		if (!c) continue;
		const data = resolveCredentialData(c.type, c.data);
		const built = buildCredentialsFile({
			exported: [{ id: slot, name: slot, type: c.type, data }],
			slots: [{ slot, type: c.type }],
			mappings: new Map([[slot, slot]]),
			registry: credentialRegistry(),
		});
		Object.assign(file, built.file);
	}
	return file;
}

/** The trigger value of the manual run: the pinned item, or a live event. */
function triggerValue(wf: JsonRecord, bundle: Bundle): JsonRecord {
	const node = (Array.isArray(wf.nodes) ? wf.nodes : [])
		.filter(isRecord)
		.find((n) => n.name === bundle.run.trigger);
	const type = typeof node?.type === 'string' ? node.type : '';
	const pinned = bundle.run.pinData?.[bundle.run.trigger]?.[0]?.json;
	if (pinned) {
		// A webhook item is `{ headers, params, query, body }`; other triggers are stand-in
		// webhooks whose item is the request body.
		return type === 'n8n-nodes-base.webhook' ? pinned : { body: pinned };
	}
	if (/scheduleTrigger$|\.cron$|\.interval$/.test(type)) return { scheduledAt: Date.now() };
	return { body: {}, headers: {}, query: {} };
}

/** ENGINE_TEST_REFRESH=0 sends the stored OAuth2 tokens as they are. */
const REFRESH_OAUTH = process.env.ENGINE_TEST_REFRESH !== '0';

async function refreshTokens(
	env: NodeJS.ProcessEnv,
	file: string,
	log: (name: string, text: string) => void,
): Promise<CredentialsFile> {
	const child = spawn(
		process.execPath,
		[join(packageRoot, 'scripts', 'gym', 'oauth-refresh.ts'), file],
		{
			env,
			stdio: ['ignore', 'pipe', 'pipe'],
		},
	);
	const out: string[] = [];
	child.stdout.on('data', (d: Buffer) => out.push(d.toString()));
	child.stderr.on('data', (d: Buffer) => out.push(d.toString()));
	await new Promise<void>((resolve) => child.on('exit', () => resolve()));
	log('oauth-refresh.txt', out.join(''));
	const doc: unknown = JSON.parse(readFileSync(file, 'utf8'));
	const file2: CredentialsFile = {};
	if (isRecord(doc)) {
		for (const [slot, entry] of Object.entries(doc)) {
			if (isRecord(entry) && typeof entry.type === 'string' && isRecord(entry.data)) {
				file2[slot] = {
					type: entry.type,
					data: entry.data,
					...(isRecord(entry.inject) ? { inject: entry.inject } : {}),
				};
			}
		}
	}
	return file2;
}

/** Runs a failed step again in the host's runner (`host-step.ts`) and gives its error. */
async function stepError(
	env: NodeJS.ProcessEnv,
	dir: string,
	step: string,
	events: WfrtEvent[],
	credentials: CredentialsFile,
): Promise<string> {
	const started = [...events]
		.reverse()
		.find((e) => e.type === 'step' && e.step === step && e.status === 'started');
	if (!started || !isRecord(started.args)) return 'no step arguments';
	if (typeof started.args.type !== 'string' && typeof started.args.code !== 'string') {
		return `http step ${String(started.args.method)} ${String(started.args.url)}`;
	}
	const stepFile = join(dir, 'diag-step.json');
	const outFile = join(dir, 'diag-result.json');
	writeFileSync(stepFile, JSON.stringify({ step, args: started.args, credentials }), {
		mode: 0o600,
	});
	const child = spawn(
		process.execPath,
		[join(packageRoot, 'scripts', 'gym', 'host-step.ts'), stepFile, outFile],
		{
			env,
			stdio: 'ignore',
		},
	);
	await new Promise<void>((resolve) => {
		const timer = setTimeout(() => child.kill('SIGKILL'), 60_000);
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

function finish(): void {
	active--;
	if (active > 0) return;
	clearTimeout(idle);
	idle = setTimeout(() => {
		if (active === 0) void engineDown();
	}, IDLE_MS);
}

export async function execute(bundle: Bundle): Promise<unknown> {
	active++;
	clearTimeout(idle);
	const scratch = mkdtempSync(join(SCRATCH_ROOT, `wfrt-${bundle.meta.id}-`));
	const log = (name: string, text: string) => writeFileSync(join(scratch, name), text);
	const tableFiles: string[] = [];
	const wf = withDataTables(bundle, tableFiles);
	let succeeded = false;
	const executionId = String(executionSeq++);
	const workflowId = `et-${executionId}`;
	try {
		const { wfrt, engine } = await engineUp();
		const converted = convertWorkflow(wf, {
			name: typeof bundle.meta.name === 'string' ? bundle.meta.name : bundle.meta.id,
			resolveWorkflow: (id) => (id === STUB_ID ? bundle.resources.subworkflow : undefined),
			trace: 'all',
			scheduleItem: 'v1',
			trigger: bundle.run.trigger,
			// A live app trigger polls once, as the reference n8n does in a manual run.
			pollTrigger: bundle.run.pinData?.[bundle.run.trigger] === undefined,
			// As n8n before a manual run: the parameter issues of the nodes fail the run.
			checkReady: true,
			pinnedNodes: Object.keys(bundle.run.pinData ?? {}),
			instance: INSTANCE,
			// `ENGINE_TEST_SERVICES=0`: the Data Table node runs in the host, as before `ctx.service`.
			services: process.env.ENGINE_TEST_SERVICES !== '0',
		});
		log('workflow.ts', converted.source);
		if (!converted.ok) {
			const why =
				converted.diagnostics.find((d) => d.severity === 'error')?.message ?? 'convert failed';
			return await summarise(wf, 'error', { runData: {}, error: { message: `convert: ${why}` } });
		}
		const compiled = compile(converted.source, { fileName: '/workflow.ts' });
		if (!compiled.ok || !compiled.module) {
			const why = compiled.diagnostics[0]?.message ?? 'compile failed';
			return await summarise(wf, 'error', { runData: {}, error: { message: `compile: ${why}` } });
		}
		let credentials = credentialsFor(converted.credentials ?? {}, bundle);
		mkdirSync(scratch, { recursive: true });
		writeFileSync(join(scratch, 'credentials.json'), JSON.stringify(credentials), { mode: 0o600 });
		// `wfrt` does not refresh OAuth2 tokens, and the stored tokens of a snapshot can have
		// expired: refresh them first, as n8n would have to before it sends the document.
		if (REFRESH_OAUTH) {
			credentials = await refreshTokens(engine.nodeEnv, join(scratch, 'credentials.json'), log);
		}
		await wfrt.putWorkflow(workflowId, {
			versionId: 'v1',
			module: Buffer.from(compiled.module).toString('base64'),
			active: false,
			webhookPrefix: '/webhook',
			credentials,
		});
		const timeoutMs = (bundle.run.timeoutS ?? 300) * 1000;
		// n8n recorded the run on the wall clock at prepare time (`prepared_at`, written right
		// after the snapshot), not on the tenant clock of the gym (`clockAt`, a simulated time):
		// give this run that start time, so a branch on the day or the hour goes the same way.
		const preparedAt =
			typeof bundle.meta.prepared_at === 'string' ? Date.parse(bundle.meta.prepared_at) : NaN;
		const clockOffsetMs = Number.isNaN(preparedAt) ? undefined : preparedAt - Date.now();
		const run = await wfrt.run(
			workflowId,
			executionId,
			triggerValue(wf, bundle),
			timeoutMs,
			clockOffsetMs,
		);
		await wfrt.deleteWorkflow(workflowId);
		log('events.jsonl', run.events.map((e) => JSON.stringify(e)).join('\n'));
		const end = run.end;
		const status = !end
			? 'timeout'
			: end.type === 'waiting'
				? 'waiting'
				: end.status === 'ok'
					? 'success'
					: 'error';
		const runData = runDataOf(wf, bundle.run.trigger, run.events);
		let error: JsonRecord | undefined;
		if (status === 'error' && end) {
			// A library node that fails inside the run has no failed step event: its trace names it.
			const traced = [...nodeErrors(run.events)].pop();
			const step =
				typeof end.step === 'string' ? end.step : traced !== undefined ? traced[0] : undefined;
			const failed = [...run.events]
				.reverse()
				.find((e) => e.type === 'step' && e.status === 'failed' && (!step || e.step === step));
			let message =
				typeof failed?.error === 'string'
					? failed.error
					: isRecord(end.result) && typeof end.result.message === 'string'
						? end.result.message
						: String(end.status);
			if (!failed && end.status === 'needs_attention' && step) {
				// `wfrt` sends no `failed` event here: run the step again in the host for its error.
				message = `needs_attention: ${await stepError(engine.nodeEnv, scratch, step, run.events, credentials)}`;
			}
			const isNode = (Array.isArray(wf.nodes) ? wf.nodes : []).some(
				(n) => isRecord(n) && n.name === step,
			);
			// As n8n: the message and the description of the error are separate fields.
			const description =
				traced !== undefined && traced[0] === step
					? traced[1].description
					: isRecord(end.result)
						? end.result.description
						: undefined;
			error = {
				message,
				...(typeof description === 'string' && description !== '' ? { description } : {}),
				node: step && isNode ? { name: step } : undefined,
			};
			if (step && isNode && !Array.isArray(runData[step])) {
				const list: unknown[] = [];
				runData[step] = [...list, { error: { message } }];
			}
		}
		succeeded = status === 'success';
		const last = [...run.events].reverse().find((e) => e.type === 'trace' || e.type === 'step');
		return await summarise(wf, status, {
			runData,
			lastNodeExecuted: typeof last?.step === 'string' ? last.step : undefined,
			error,
		});
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		log('error.txt', message);
		return await summarise(wf, 'error', { runData: {}, error: { message } });
	} finally {
		for (const file of tableFiles) remove(file);
		if (KEEP !== 'all' && !(KEEP === 'failed' && !succeeded)) remove(scratch);
		finish();
	}
}
