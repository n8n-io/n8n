/**
 * Differential end-to-end test against the ai-gym: each sample workflow whose
 * external nodes the gym serves runs (a) on n8n's v1 engine and (b) on the
 * compiled engine (`wfrt` and the fallback host), against a tenant seeded
 * with the same world. The script compares the output items of each node and
 * the gym state after each run, and writes `docs/gym-diff.md`.
 *
 *   node scripts/gym-diff.ts [--only <path part>] [--limit <n>] [--concurrency <n>]
 *       [--timeout <ms>] [--work <dir>] [--no-build] [--eligibility-only]
 *       [--baseline <summary.json>] [--keep-tenants] [--report <file>]
 *
 * It builds the gym (Go), `wfrt` (Zig) and the fallback host, starts them on
 * free ports, runs the workflows in a worker pool, and stops every process
 * by its PID at the end. Logs: `<work>/runs/<n>/run.log`.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { Classification } from './gym/eligibility.ts';
import { classify } from './gym/eligibility.ts';
import { GymAdmin } from './gym/gym-admin.ts';
import { build, HARNESS_TOKEN, startStack, stopAll } from './gym/processes.ts';
import type { Summary } from './gym/report.ts';
import { summarize, writeReport } from './gym/report.ts';
import type { RunReport } from './gym/run-one.ts';
import { runOne } from './gym/run-one.ts';
import type { Sample } from './gym/sample.ts';
import {
	collectSample,
	idIndex,
	isRecord,
	nodesOf,
	packageRoot,
	resolverFor,
} from './gym/sample.ts';
import { loadContracts } from './gym/services.ts';
import { V1Pool } from './gym/v1-pool.ts';
import { WfrtClient } from './gym/wfrt.ts';

/** Services whose gym vendor needs a real server (a sidecar) that the host runtime does not start. */
export const SIDECAR_SERVICES = new Set(['postgres', 'mysql', 'ftp', 'wordpress', 'supabase']);

interface Args {
	only: string;
	limit: number;
	concurrency: number;
	timeoutMs: number;
	work: string;
	noBuild: boolean;
	eligibilityOnly: boolean;
	baseline?: string;
	keepTenants: boolean;
	report: string;
}

function parseArgs(argv: string[]): Args {
	const value = (flag: string): string | undefined => {
		const i = argv.indexOf(flag);
		return i >= 0 ? argv[i + 1] : undefined;
	};
	return {
		only: value('--only') ?? '',
		limit: Number(value('--limit') ?? '0'),
		concurrency: Number(value('--concurrency') ?? '4'),
		timeoutMs: Number(value('--timeout') ?? '60000'),
		work: value('--work') ?? join(tmpdir(), `gym-diff-${Date.now()}`),
		noBuild: argv.includes('--no-build'),
		eligibilityOnly: argv.includes('--eligibility-only'),
		baseline: value('--baseline'),
		keepTenants: argv.includes('--keep-tenants'),
		report: value('--report') ?? join(packageRoot, 'docs', 'gym-diff.md'),
	};
}

function calleeList(sample: Sample, resolve: (id: string) => Record<string, unknown> | undefined) {
	const out: Array<Record<string, unknown>> = [];
	for (const n of nodesOf(sample.workflow)) {
		if (n.type !== 'n8n-nodes-base.executeWorkflow') continue;
		const raw = n.parameters?.workflowId;
		const id = (
			typeof raw === 'string'
				? raw
				: isRecord(raw) && (typeof raw.value === 'string' || typeof raw.value === 'number')
					? String(raw.value)
					: ''
		).replace(/^=/, '');
		const w = id ? resolve(id) : undefined;
		if (w) out.push(w);
	}
	return out;
}

async function pool<T, R>(
	items: T[],
	size: number,
	fn: (item: T, i: number) => Promise<R>,
): Promise<R[]> {
	const out: R[] = new Array<R>(items.length);
	let next = 0;
	const workers = Array.from({ length: Math.max(1, size) }, async () => {
		while (next < items.length) {
			const i = next++;
			out[i] = await fn(items[i], i);
		}
	});
	await Promise.all(workers);
	return out;
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const started = Date.now();
	const samples = collectSample();
	const byId = idIndex(samples);
	const contracts = loadContracts();
	const classified: Array<{
		sample: Sample;
		cls: Classification;
		resolve: (id: string) => Record<string, unknown> | undefined;
	}> = [];
	for (const sample of samples) {
		const resolve = resolverFor(sample, byId);
		classified.push({
			sample,
			cls: classify(sample.workflow, contracts, calleeList(sample, resolve)),
			resolve,
		});
	}
	const toRun = classified
		.filter((c) => c.cls.status === 'eligible' && c.sample.key.includes(args.only))
		.filter((c) => !c.cls.services.some((s) => SIDECAR_SERVICES.has(s)));
	const selected = args.limit > 0 ? toRun.slice(0, args.limit) : toRun;
	process.stdout.write(
		`sample ${samples.length}; eligible ${classified.filter((c) => c.cls.status === 'eligible').length}; to run ${selected.length}\n`,
	);

	let reports: RunReport[] = [];
	if (!args.eligibilityOnly && selected.length > 0) {
		mkdirSync(args.work, { recursive: true });
		process.stdout.write(`work folder ${args.work}\n`);
		const gymBin = join(args.work, 'gym');
		build(args.work, { gym: true, wfrt: !args.noBuild, host: !args.noBuild });
		const stop = () => {
			void stopAll().then(() => process.exit(130));
		};
		process.on('SIGINT', stop);
		process.on('SIGTERM', stop);
		try {
			const stack = await startStack(args.work, gymBin);
			const gym = new GymAdmin(stack.gymAdmin, HARNESS_TOKEN);
			const wfrt = new WfrtClient(stack.wfrtAdmin, stack.wfrtSecret);
			await wfrt.open();
			const runId = Date.now().toString(36);
			const nodeEnv = {
				...process.env,
				...stack.gymEnv,
				TZ: 'UTC',
				N8N_USER_FOLDER: join(args.work, 'v1-home'),
			};
			const v1 = new V1Pool(nodeEnv, join(args.work, 'out', 'v1.log'));
			let done = 0;
			reports = await pool(selected, args.concurrency, async (c, i) => {
				const r = await runOne(
					{
						gym,
						wfrt,
						nodeEnv,
						v1,
						work: args.work,
						runId,
						timeoutMs: args.timeoutMs,
						keepTenants: args.keepTenants,
					},
					c.sample,
					i,
					c.cls,
					c.resolve,
				);
				done++;
				process.stdout.write(
					`[${done}/${selected.length}] ${r.outcome.padEnd(14)} ${c.sample.key}\n`,
				);
				return r;
			});
			wfrt.close();
			v1.close();
		} finally {
			await stopAll();
		}
		writeFileSync(join(args.work, 'reports.json'), JSON.stringify(reports, null, 1));
	}
	const summary: Summary = summarize(
		classified.map((c) => ({ key: c.sample.key, cls: c.cls })),
		reports,
		{
			selected: selected.length,
			sidecar: classified.filter(
				(c) => c.cls.status === 'eligible' && c.cls.services.some((s) => SIDECAR_SERVICES.has(s)),
			).length,
			minutes: (Date.now() - started) / 60_000,
		},
	);
	if (!args.eligibilityOnly)
		writeFileSync(join(args.work, 'summary.json'), JSON.stringify(summary, null, 1));
	const baseline: Summary | undefined =
		args.baseline && existsSync(args.baseline)
			? JSON.parse(readFileSync(args.baseline, 'utf8'))
			: undefined;
	writeReport(args.report, summary, reports, baseline);
	process.stdout.write(`report ${args.report}\n`);
}

void main().catch(async (e: unknown) => {
	process.stderr.write(`gym-diff: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}\n`);
	await stopAll();
	process.exit(1);
});
