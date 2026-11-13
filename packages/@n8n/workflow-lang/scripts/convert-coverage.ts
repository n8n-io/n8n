/**
 * Measures how many v1 workflows convert to the workflow language, and checks
 * the converted code. The sample is the same as for
 * `scripts/expression-coverage.ts`: every workflow JSON that git tracks under
 * `packages/`. It writes `docs/convert-coverage.md`.
 *
 * For each workflow it:
 * 1. converts the JSON (`convertWorkflow`) and compiles the source again;
 * 2. runs the source on the reference runner with synthetic step results
 *    (smoke run): node and code steps give their input items back, HTTP gives
 *    an empty JSON body, approvals approve;
 * 3. when every node can run offline in n8n's engine (core nodes, Code, test
 *    nodes, resolved sub-workflows), runs the JSON in n8n's engine (the
 *    oracle) and the source with step results from the fallback host, and
 *    compares the output of each node.
 *
 * Sub-workflows: the script resolves an Execute Workflow id to a sample
 * workflow with that id, to `<id>.json` in the same folder, or to the
 * `…-child…` file next to a `…-parent…` file (the test suites replace these
 * ids when they run).
 *
 * Run: node scripts/convert-coverage.ts [--no-run] [--only <path part>]
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';

import { triggerFor } from '../src/convert/__tests__/behaviour/compare.ts';
import type { OracleWorkflow } from '../src/convert/__tests__/behaviour/oracle-engine.ts';
import { compile } from '../src/compiler/index.ts';
import { convertWorkflow } from '../src/convert/index.ts';
import type { ConvertDiagnostic } from '../src/convert/index.ts';
import type { WorkerResult, WorkerTask } from './convert-coverage-worker.ts';
import { explain } from './convert-coverage-explained.ts';
import { NOTES } from './convert-coverage-notes.ts';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = join(packageRoot, '..', '..', '..');

function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Finds workflow objects (a `nodes` array of typed nodes) anywhere in a JSON document. */
function workflows(doc: unknown, out: Array<Record<string, unknown>> = []) {
	if (Array.isArray(doc)) {
		for (const d of doc) workflows(d, out);
	} else if (isRecord(doc)) {
		const nodes = doc.nodes;
		if (
			Array.isArray(nodes) &&
			nodes.length > 0 &&
			nodes.every((n) => isRecord(n) && typeof n.type === 'string')
		) {
			out.push(doc);
		} else {
			for (const v of Object.values(doc)) workflows(v, out);
		}
	}
	return out;
}

interface Sample {
	file: string;
	index: number;
	workflow: Record<string, unknown>;
}

function collect(): { files: number; samples: Sample[] } {
	const list = execFileSync('git', ['ls-files', '--', 'packages/**/*.json'], {
		cwd: repoRoot,
		encoding: 'utf8',
	})
		.split('\n')
		.filter((f) => f && !f.includes('node_modules') && !f.includes('/dist/'));
	const samples: Sample[] = [];
	let files = 0;
	for (const file of list) {
		let text: string;
		try {
			text = readFileSync(join(repoRoot, file), 'utf8');
		} catch {
			continue;
		}
		if (!text.includes('"nodes"')) continue;
		let doc: unknown;
		try {
			doc = JSON.parse(text);
		} catch {
			continue;
		}
		const wfs = workflows(doc);
		if (wfs.length === 0) continue;
		files++;
		wfs.forEach((workflow, index) => samples.push({ file, index, workflow }));
	}
	return { files, samples };
}

function pct(n: number, d: number): string {
	return d === 0 ? '0%' : `${((100 * n) / d).toFixed(1)}%`;
}

function cell(text: string): string {
	return text.replace(/\s+/g, ' ').replace(/\|/g, '\\|').replace(/`/g, "'");
}

/** The blocker key of an error: the code, plus the node type for unsupported nodes. */
function blocker(d: ConvertDiagnostic, types: Map<string, string>): string {
	const type = d.node ? (types.get(d.node) ?? '') : '';
	const short = type.replace('n8n-nodes-base.', '');
	if (d.code === 'unsupported-node' || d.code === 'ai-sub-nodes' || d.code === 'fallback-outputs') {
		return `${d.code}: ${short}`;
	}
	if (d.code === 'expression') return `expression: ${d.feature ?? '?'}`;
	return d.code;
}

// ---- Sub-workflows ----------------------------------------------------------

function resolverFor(sample: Sample, byId: Map<string, unknown>) {
	const seen = new Map<string, unknown>();
	const dir = dirname(join(repoRoot, sample.file));
	const own = basename(sample.file);
	const resolve = (id: string): unknown => {
		if (seen.has(id)) return seen.get(id);
		let found: unknown = byId.get(id);
		const file = join(dir, `${id}.json`);
		if (found === undefined && /^[\w-]+$/.test(id) && existsSync(file)) {
			try {
				found = workflows(JSON.parse(readFileSync(file, 'utf8')))[0];
			} catch {
				found = undefined;
			}
		}
		if (found === undefined && own.includes('parent')) {
			const prefix = own.slice(0, own.indexOf('parent'));
			const child = readdirSync(dir)
				.filter((f) => f.startsWith(`${prefix}child`) && f.endsWith('.json'))
				.sort()[0];
			if (child) found = workflows(JSON.parse(readFileSync(join(dir, child), 'utf8')))[0];
		}
		seen.set(id, found);
		return found;
	};
	return { resolve, seen };
}

// ---- Oracle eligibility -------------------------------------------------------

/** Node types that n8n's engine runs without network, credentials or a server. */
const OFFLINE = new Set([
	...[
		'set',
		'if',
		'filter',
		'switch',
		'merge',
		'noOp',
		'limit',
		'sort',
		'splitOut',
		'aggregate',
		'removeDuplicates',
		'splitInBatches',
		'code',
		'function',
		'functionItem',
		'stopAndError',
		'respondToWebhook',
		'dateTime',
		'crypto',
		'itemLists',
		'renameKeys',
		'compareDatasets',
		'summarize',
		'markdown',
		'xml',
		'html',
		'executeWorkflow',
		'executeWorkflowTrigger',
		'manualTrigger',
		'webhook',
		'scheduleTrigger',
		'cron',
		'interval',
		'start',
		'stickyNote',
	].map((t) => `n8n-nodes-base.${t}`),
	'n8n-nodes-testing.testData',
]);

interface Node {
	name: string;
	type: string;
	parameters?: Record<string, unknown>;
	disabled?: boolean;
}

function nodesOf(wf: Record<string, unknown>): Node[] {
	return (Array.isArray(wf.nodes) ? wf.nodes : []).filter(
		(n): n is Node => isRecord(n) && typeof n.name === 'string' && typeof n.type === 'string',
	);
}

function isTrigger(type: string): boolean {
	return (
		type === 'n8n-nodes-base.webhook' || /trigger$/i.test(type) || type === 'n8n-nodes-base.start'
	);
}

/** The trigger that the converter keeps: a webhook, else a schedule, else the first trigger. */
function mainTrigger(wf: Record<string, unknown>): Node | undefined {
	const targets = new Set<string>();
	const conns = isRecord(wf.connections) ? wf.connections : {};
	for (const types of Object.values(conns)) {
		if (!isRecord(types)) continue;
		for (const outputs of Object.values(types)) {
			if (!Array.isArray(outputs)) continue;
			for (const list of outputs) {
				if (!Array.isArray(list)) continue;
				for (const c of list) if (isRecord(c) && typeof c.node === 'string') targets.add(c.node);
			}
		}
	}
	const triggers = nodesOf(wf).filter((n) => isTrigger(n.type) && !targets.has(n.name));
	const rank = (n: Node) =>
		n.disabled
			? 3
			: n.type === 'n8n-nodes-base.webhook'
				? 0
				: n.type === 'n8n-nodes-base.scheduleTrigger'
					? 1
					: 2;
	return [...triggers].sort((a, b) => rank(a) - rank(b))[0];
}

/** A reason why the oracle cannot run the workflow, or null. */
function oracleBlocker(wf: Record<string, unknown>, callees: Map<string, unknown>): string | null {
	const all = [wf, ...[...callees.values()].filter(isRecord)];
	for (const w of all) {
		for (const n of nodesOf(w)) {
			if (!OFFLINE.has(n.type)) return n.type;
			if (
				n.type === 'n8n-nodes-base.code' &&
				(n.parameters?.language ?? 'javaScript') !== 'javaScript'
			)
				return 'python';
			if (n.type === 'n8n-nodes-base.executeWorkflow') {
				const source = n.parameters?.source ?? 'database';
				if (source !== 'database' && source !== 'parameter') return 'sub-workflow source';
			}
		}
	}
	return null;
}

// ---- Worker pool --------------------------------------------------------------

class Pool {
	private readonly idle: Worker[] = [];

	private readonly waiting: Array<() => void> = [];

	private live = 0;

	private readonly size: number;

	constructor(size: number) {
		this.size = size;
	}

	private spawn(): Worker {
		// A workflow that loops forever fills its trace: the worker ends at this limit, not the report.
		return new Worker(join(packageRoot, 'scripts', 'convert-coverage-worker.ts'), {
			resourceLimits: { maxOldGenerationSizeMb: 1024 },
		});
	}

	private async acquire(): Promise<Worker> {
		const w = this.idle.pop();
		if (w) return w;
		if (this.live < this.size) {
			this.live++;
			return this.spawn();
		}
		await new Promise<void>((r) => this.waiting.push(r));
		return await this.acquire();
	}

	private release(w: Worker | null) {
		if (w) this.idle.push(w);
		else this.live--;
		this.waiting.shift()?.();
	}

	async run(task: WorkerTask, timeoutMs: number): Promise<WorkerResult> {
		const worker = await this.acquire();
		return await new Promise<WorkerResult>((resolve) => {
			const timer = setTimeout(() => {
				worker.removeAllListeners('message');
				void worker.terminate();
				this.release(null);
				resolve({ id: task.id, status: 'timeout' });
			}, timeoutMs);
			worker.once('message', (result: WorkerResult) => {
				clearTimeout(timer);
				this.release(worker);
				resolve(result);
			});
			worker.once('error', (e: Error) => {
				clearTimeout(timer);
				this.release(null);
				resolve(
					e.message.includes('out of memory')
						? { id: task.id, status: 'timeout' }
						: { id: task.id, crash: `worker: ${e.message}` },
				);
			});
			worker.postMessage(task);
		});
	}

	async close() {
		for (const w of this.idle) await w.terminate();
	}
}

// ---- Report -------------------------------------------------------------------

interface Mismatch {
	file: string;
	nodes: string[];
	example: string;
}

async function main() {
	const args = process.argv.slice(2);
	const noRun = args.includes('--no-run');
	const only = args.includes('--only') ? (args[args.indexOf('--only') + 1] ?? '') : '';
	const started = Date.now();
	const collected = collect();
	const files = collected.files;
	const samples = collected.samples.filter((s) => s.file.includes(only));
	const byId = new Map<string, unknown>();
	for (const s of collected.samples) {
		const id = s.workflow.id;
		if ((typeof id === 'string' || typeof id === 'number') && !byId.has(String(id)))
			byId.set(String(id), s.workflow);
	}
	let full = 0;
	let withFallback = 0;
	let failed = 0;
	let compiledOk = 0;
	let standIn = 0;
	let crashed = 0;
	let engineShape = 0;
	let subWorkflowFunctions = 0;
	const blocking = new Map<string, number>();
	const onlyBlocker = new Map<string, number>();
	const examples = new Map<string, string>();
	const fallbackTypes = new Map<string, number>();
	const warnings = new Map<string, number>();
	const nodeTotals = { native: 0, fallback: 0 };
	const pool = new Pool(6);
	const smoke = new Map<string, number>();
	const smokeExamples = new Map<string, string>();
	const oracle = { eligible: 0, match: 0, mismatch: 0, oracleError: 0, timeout: 0, crash: 0 };
	const oracleSkip = new Map<string, number>();
	const mismatches: Mismatch[] = [];
	/** The oracle verdict of each workflow, a baseline to compare runs with. */
	const verdicts: Record<string, string> = {};
	const jobs: Array<Promise<void>> = [];
	let id = 0;

	for (const s of samples) {
		const types = new Map<string, string>();
		for (const n of nodesOf(s.workflow)) types.set(n.name, n.type);
		const { resolve, seen } = resolverFor(s, byId);
		let result;
		try {
			result = convertWorkflow(s.workflow, {
				name: s.file.replace(/^.*\//, '').replace(/\.json$/, ''),
				resolveWorkflow: resolve,
				trace: 'all',
			});
		} catch (e) {
			crashed++;
			failed++;
			const key = `converter crash: ${e instanceof Error ? e.message.slice(0, 60) : String(e)}`;
			blocking.set(key, (blocking.get(key) ?? 0) + 1);
			if (!examples.has(key)) examples.set(key, s.file);
			continue;
		}
		for (const d of result.diagnostics) {
			if (d.severity === 'warning') warnings.set(d.code, (warnings.get(d.code) ?? 0) + 1);
		}
		if (result.diagnostics.some((d) => d.code === 'unsupported-trigger')) standIn++;
		if (result.diagnostics.some((d) => d.code === 'engine')) engineShape++;
		if (/\basync function \w+\(items: Json\[\]\): Promise<Json\[\]\[\]>/.test(result.source))
			subWorkflowFunctions++;
		if (!result.ok) {
			failed++;
			const keys = new Set(
				result.diagnostics.filter((d) => d.severity === 'error').map((d) => blocker(d, types)),
			);
			for (const k of keys) {
				blocking.set(k, (blocking.get(k) ?? 0) + 1);
				if (!examples.has(k)) {
					const d = result.diagnostics.find(
						(x) => x.severity === 'error' && blocker(x, types) === k,
					);
					examples.set(k, `${s.file}: ${d?.message ?? ''}`);
				}
			}
			if (keys.size === 1) {
				const [first] = keys;
				onlyBlocker.set(first, (onlyBlocker.get(first) ?? 0) + 1);
			}
			continue;
		}
		// Compile again, as a user would with `wfc compile`.
		const recompiled = compile(result.source, { fileName: '/workflow.ts' });
		const compiled = recompiled.ok;
		if (!compiled) {
			const d = recompiled.diagnostics[0];
			const key = 'compile error';
			smoke.set(key, (smoke.get(key) ?? 0) + 1);
			if (!smokeExamples.has(key))
				smokeExamples.set(key, `${s.file}: ${d ? `${d.code} ${d.message} (line ${d.line})` : ''}`);
		}
		if (compiled) compiledOk++;
		if (result.fallbackNodes.length === 0) full++;
		else withFallback++;
		for (const n of result.fallbackNodes) {
			const t = (types.get(n) ?? '?').replace('n8n-nodes-base.', '');
			fallbackTypes.set(t, (fallbackTypes.get(t) ?? 0) + 1);
		}
		nodeTotals.fallback += result.fallbackNodes.length;
		nodeTotals.native += types.size - result.fallbackNodes.length;
		if (noRun || !compiled) continue;

		const trigger = mainTrigger(s.workflow);
		const choice = triggerFor(trigger ?? { name: 'Start', type: 'n8n-nodes-base.manualTrigger' });
		const source = result.source;
		const where = `${s.file}${s.index > 0 ? `#${s.index}` : ''}`;
		jobs.push(
			pool.run({ id: id++, kind: 'smoke', source, trigger: choice }, 30_000).then((r) => {
				const key = r.crash
					? 'crash'
					: r.status === 'ok'
						? r.settled === false
							? 'ok (step results did not settle)'
							: 'ok'
						: r.status === 'error'
							? `error: ${r.error?.name ?? '?'}`
							: (r.status ?? '?');
				if (key === 'crash') crashed++;
				smoke.set(key, (smoke.get(key) ?? 0) + 1);
				if (key !== 'ok' && !smokeExamples.has(key))
					smokeExamples.set(key, `${where}: ${r.crash ?? r.error?.message ?? ''}`);
			}),
		);
		const callees = new Map([...seen.entries()].filter(([, v]) => v !== undefined));
		const reason = trigger ? oracleBlocker(s.workflow, callees) : 'no trigger';
		if (reason !== null) {
			const key = reason.replace('n8n-nodes-base.', '');
			oracleSkip.set(key, (oracleSkip.get(key) ?? 0) + 1);
			continue;
		}
		oracle.eligible++;
		const task: WorkerTask = {
			id: id++,
			kind: 'oracle',
			source,
			trigger: choice,
			workflow: s.workflow as unknown as OracleWorkflow,
			callees: Object.fromEntries(callees),
		};
		jobs.push(
			pool.run(task, 60_000).then((r) => {
				const diffs = (r.mismatches ?? []).map((m) => ({
					node: m.node,
					expected: m.expected,
					actual: m.actual,
				}));
				verdicts[where] = r.crash
					? 'crash'
					: r.status === 'timeout'
						? 'timeout'
						: diffs.length === 0
							? 'match'
							: `mismatch ${JSON.stringify(diffs).slice(0, 4000)}`;
				if (r.crash) {
					oracle.crash++;
					mismatches.push({ file: where, nodes: [], example: `crash: ${r.crash}` });
				} else if (r.status === 'timeout') {
					oracle.timeout++;
					mismatches.push({ file: where, nodes: [], example: 'timeout' });
				} else if ((r.mismatches ?? []).length === 0) {
					oracle.match++;
					if (r.oracleError) oracle.oracleError++;
				} else {
					oracle.mismatch++;
					if (r.oracleError) oracle.oracleError++;
					const first = r.mismatches?.[0];
					mismatches.push({
						file: where,
						nodes: (r.mismatches ?? []).map((m) => m.node),
						example: first
							? `${first.node}: n8n ${JSON.stringify(first.expected)?.slice(0, 120)} / converted ${JSON.stringify(first.actual)?.slice(0, 120)}${r.oracleError ? ` (n8n error: ${r.oracleError.slice(0, 80)})` : ''}${r.status !== 'ok' ? ` (converted ${r.status}: ${r.error?.message ?? ''})` : ''}`
							: '',
					});
				}
			}),
		);
	}
	await Promise.all(jobs);
	await pool.close();

	const total = samples.length;
	const converted = full + withFallback;
	const rank = (m: Map<string, number>) =>
		[...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
	const smokeTotal = [...smoke.values()].reduce((a, b) => a + b, 0);

	const lines: string[] = [];
	lines.push('# Workflow conversion coverage');
	lines.push('');
	lines.push('Generated by `node scripts/convert-coverage.ts`. Do not edit.');
	lines.push('');
	lines.push(
		'The sample is every workflow in the JSON files that git tracks under `packages/` (the same sample as',
	);
	lines.push(
		'`docs/expression-coverage.md`): test fixtures, node test workflows and templates. Each workflow goes',
	);
	lines.push(
		'through `convertWorkflow` (`src/convert/`). A workflow converts when no diagnostic is an error. It',
	);
	lines.push(
		'converts fully when no step runs in the fallback host. The script compiles each converted source again,',
	);
	lines.push('runs it, and compares it with n8n where it can (see "Runs" below).');
	lines.push('');
	lines.push('| Measure | Value |');
	lines.push('|---|---|');
	lines.push(`| Workflow files | ${files} |`);
	lines.push(`| Workflows | ${total} |`);
	lines.push(`| Convert fully (no fallback-host step) | ${full} (${pct(full, total)}) |`);
	lines.push(
		`| Convert with fallback-host steps | ${withFallback} (${pct(withFallback, total)}) |`,
	);
	lines.push(`| Fail | ${failed} (${pct(failed, total)}) |`);
	lines.push(`| Converted sources that compile | ${compiledOk} of ${converted} |`);
	lines.push(`| Converted with a stand-in webhook for the trigger | ${standIn} |`);
	lines.push(`| Converted in the engine shape (v1 run stack) | ${engineShape} |`);
	lines.push(`| Converted with sub-workflow functions | ${subWorkflowFunctions} |`);
	lines.push(`| Converter and smoke-run crashes | ${crashed} |`);
	lines.push(
		`| Nodes in converted workflows: native or library / fallback host | ${nodeTotals.native} / ${nodeTotals.fallback} |`,
	);
	lines.push('');
	if (!noRun) {
		lines.push('## Runs');
		lines.push('');
		lines.push(
			'**Smoke run.** Each converted workflow runs on the reference runner. Node and code steps give their',
		);
		lines.push(
			'input items back, HTTP gives `{ status: 200, body: {} }`, approvals give `{ approved: true, data: {} }`.',
		);
		lines.push(
			'An `error` status is the workflow failing on these synthetic results (for example a Stop and Error',
		);
		lines.push(
			'node, or a field that the synthetic result does not have). A crash is an exception outside the workflow.',
		);
		lines.push('');
		lines.push('| Smoke run result | Workflows | Example |');
		lines.push('|---|---|---|');
		for (const [k, n] of rank(smoke)) {
			lines.push(`| ${cell(k)} | ${n} | ${cell((smokeExamples.get(k) ?? '').slice(0, 160))} |`);
		}
		lines.push(`| **Total** | ${smokeTotal} | |`);
		lines.push('');
		lines.push(
			'**Oracle comparison.** A workflow is eligible when every node runs offline in n8n: core nodes, Code',
		);
		lines.push(
			'(JavaScript), Function, test-data nodes and sub-workflows that the script resolves. Both ignore pinned data.',
		);
		lines.push(
			"The script runs the JSON in n8n's engine (`behaviour/oracle-engine.ts`) and the converted source with",
		);
		lines.push(
			"step results from the fallback host's code and node runners, and compares each node's output lists",
		);
		lines.push('(the items of all runs of the node, from `ctx.trace`).');
		lines.push('');
		lines.push('| Measure | Value |');
		lines.push('|---|---|');
		lines.push(`| Eligible workflows | ${oracle.eligible} |`);
		lines.push(`| Every node matches | ${oracle.match} |`);
		lines.push(`| Some node differs | ${oracle.mismatch} |`);
		lines.push(`| Timeouts / crashes | ${oracle.timeout} / ${oracle.crash} |`);
		lines.push(`| n8n itself ends with an error (counted above) | ${oracle.oracleError} |`);
		lines.push('');
		lines.push(
			'Workflows that are not eligible, by the first node type that n8n cannot run offline:',
		);
		lines.push('');
		lines.push('| Reason | Workflows |');
		lines.push('|---|---|');
		for (const [k, n] of rank(oracleSkip).slice(0, 15)) lines.push(`| \`${cell(k)}\` | ${n} |`);
		lines.push('');
		lines.push('### Differences from n8n');
		lines.push('');
		lines.push('| Workflow | Nodes that differ | First difference | Why |');
		lines.push('|---|---|---|---|');
		for (const m of mismatches.sort((a, b) => a.file.localeCompare(b.file))) {
			lines.push(
				`| ${cell(m.file)} | ${cell(m.nodes.join(', '))} | ${cell(m.example.slice(0, 200))} | ${cell(explain(m.file))} |`,
			);
		}
		lines.push('');
	}
	lines.push('## Blockers, ranked');
	lines.push('');
	lines.push(
		'"Blocks" counts the workflows that the blocker stops. "Only blocker" counts the workflows that would',
	);
	lines.push('convert if only this blocker were removed.');
	lines.push('');
	lines.push('| # | Blocker | Blocks | Only blocker | Example |');
	lines.push('|---|---|---|---|---|');
	rank(blocking)
		.slice(0, 40)
		.forEach(([k, n], i) => {
			lines.push(
				`| ${i + 1} | \`${cell(k)}\` | ${n} | ${onlyBlocker.get(k) ?? 0} | ${cell((examples.get(k) ?? '').slice(0, 160))} |`,
			);
		});
	lines.push('');
	lines.push('## Node types that run in the fallback host');
	lines.push('');
	lines.push('Counted over the converted workflows.');
	lines.push('');
	lines.push('| Node type | Nodes |');
	lines.push('|---|---|');
	for (const [t, n] of rank(fallbackTypes).slice(0, 25)) lines.push(`| \`${t}\` | ${n} |`);
	lines.push('');
	lines.push('## Warnings');
	lines.push('');
	lines.push('| Code | Count |');
	lines.push('|---|---|');
	for (const [k, n] of rank(warnings)) lines.push(`| \`${k}\` | ${n} |`);
	lines.push('');
	lines.push(NOTES);
	if (only === '')
		writeFileSync(join(packageRoot, 'docs', 'convert-coverage.md'), lines.join('\n'));
	else console.log(lines.join('\n'));
	// `VERDICTS=<file>` writes the verdicts there; a full run also writes them next to the report.
	const verdictFile =
		process.env.VERDICTS ??
		(only === '' ? join(packageRoot, 'docs', 'convert-coverage-verdicts.json') : undefined);
	if (verdictFile) {
		const sorted = Object.entries(verdicts).sort(([a], [b]) => a.localeCompare(b));
		writeFileSync(verdictFile, `${JSON.stringify(Object.fromEntries(sorted), null, 1)}\n`);
	}
	console.log(
		`workflows ${total}: full ${full}, fallback ${withFallback}, fail ${failed}, compiled ${compiledOk}/${converted}, crashes ${crashed}; smoke ${JSON.stringify(Object.fromEntries(smoke))}; oracle ${JSON.stringify(oracle)} (${((Date.now() - started) / 1000).toFixed(0)} s)`,
	);
}

await main();
// Workers can keep the process alive; the report is written.
process.exit(0);
