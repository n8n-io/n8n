import { createTeamProject, createWorkflow, testDb, testModules } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { ExecutionLedgerRepository, StatisticsNames, WorkflowStatisticsRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { createEmptyRunExecutionData, type IRun } from 'n8n-workflow';

import {
	collectInsights,
	compactInsights,
	flushInsights,
	initializeInsightsCollection,
	registerInsightsLedgerParticipant,
} from '@n8n/backend-module-insights/testing';

import { ActiveExecutions } from '@/active-executions';
import { ExecutionLedgerFoldService } from '@/execution-ledger/execution-ledger-fold.service';
import { ExecutionPersistence } from '@/executions/execution-persistence';
import { packagedModules } from '@/modules/modules.manifest';
import { WorkflowStatisticsService } from '@/services/workflow-statistics.service';
import { ExecutionQuotaService } from '@/execution-quota/execution-quota.service';
import { WorkflowStatisticsRollupService } from '@/services/workflow-statistics-rollup.service';

/**
 * Load benchmark for the per-execution write path. Opt-in: set N8N_LEDGER_BENCH=1.
 * baseline = statistics delta table; ledger = ledger + fold; quota-* = ledger + fold + quota.
 * quota-write-only appends the started rows but skips the admission reads.
 */
type Scenario =
	| 'baseline'
	| 'ledger'
	| 'quota-write-only'
	| 'quota-workflow'
	| 'quota-both'
	| 'counter-workflow'
	| 'counter-both'
	| 'counter-memory-both'
	| 'exec-ledger'
	| 'exec-counter-separate'
	| 'exec-counter-tx'
	| 'exec-counter-tx-indexed'
	| 'exec-insights-off'
	| 'exec-insights-raw'
	| 'exec-insights-ledger';

const scenario = (process.env.BENCH_SCENARIO ?? 'baseline') as Scenario;
/** exec-* scenarios create and finish a real execution row through `ActiveExecutions`. */
const withExecution = scenario.startsWith('exec-');
/** exec-insights-* finish runs through the real statistics service, as the engine does. */
const insightsSource = scenario.startsWith('exec-insights-') ? scenario.slice(14) : undefined;
if (insightsSource === 'ledger') process.env.N8N_INSIGHTS_SOURCE = 'ledger';
const usesQuota =
	scenario.startsWith('quota') ||
	scenario.startsWith('counter') ||
	scenario.startsWith('exec-counter');
const bothScopes = scenario.endsWith('-both') || scenario.startsWith('exec-counter');
const withLedgerIndexes =
	scenario === 'exec-counter-separate' || scenario === 'exec-counter-tx-indexed';
if (scenario === 'exec-counter-separate') process.env.N8N_EXECUTION_QUOTA_STARTED_ROW = 'separate';
if (scenario.startsWith('counter') || scenario.startsWith('exec-counter')) {
	process.env.N8N_EXECUTION_QUOTA_MODE = 'counter';
	process.env.N8N_EXECUTION_QUOTA_COUNTER_STORE = scenario.startsWith('counter-memory')
		? 'memory'
		: 'redis';
}
const concurrency = Number(process.env.BENCH_CONCURRENCY ?? 64);
const durationMs = Number(process.env.BENCH_DURATION_S ?? 60) * 1000;
const workflowCount = Number(process.env.BENCH_WORKFLOWS ?? 1000);
/** Target executions per second. Unset means closed loop: every worker runs flat out. */
const targetRate = process.env.BENCH_RATE ? Number(process.env.BENCH_RATE) : undefined;
const projectCount = Math.min(10, workflowCount);
const foldIntervalMs = Number(process.env.BENCH_FOLD_INTERVAL_MS ?? 5000);
const outDir = join(process.cwd(), '../../.context/bench');

const percentile = (sorted: number[], p: number) =>
	sorted.length === 0 ? 0 : sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];

const summarize = (samples: number[]) => {
	const sorted = [...samples].sort((a, b) => a - b);
	const round = (n: number) => Math.round(n * 1000) / 1000;
	return {
		count: sorted.length,
		p50: round(percentile(sorted, 0.5)),
		p95: round(percentile(sorted, 0.95)),
		p99: round(percentile(sorted, 0.99)),
		max: round(sorted.at(-1) ?? 0),
		mean: round(sorted.reduce((a, b) => a + b, 0) / (sorted.length || 1)),
	};
};

describe.skipIf(!process.env.N8N_LEDGER_BENCH)('ledger write path benchmark', () => {
	let dataSource: DataSource;
	let tablePrefix: string;
	const workflows: Array<{
		id: string;
		name: string;
		projectId: string;
		entity: Awaited<ReturnType<typeof createWorkflow>>;
	}> = [];

	beforeAll(async () => {
		if (insightsSource) await testModules.loadModules(['insights'], packagedModules);
		await testDb.init();
		if (insightsSource) {
			initializeInsightsCollection();
			await registerInsightsLedgerParticipant();
		}
		if (process.env.BENCH_REDIS_PORT) {
			const { redis } = Container.get(GlobalConfig).queue.bull;
			redis.host = 'localhost';
			redis.port = Number(process.env.BENCH_REDIS_PORT);
		}
		dataSource = Container.get(DataSource);
		tablePrefix = Container.get(GlobalConfig).database.tablePrefix;

		if (scenario !== 'baseline') {
			await import('@/services/workflow-statistics-ledger.participant.js');
		}
		if (usesQuota) {
			await import('@/execution-quota/execution-quota.participant.js');
		}

		const projects = [];
		for (let i = 0; i < projectCount; i++) projects.push(await createTeamProject(`bench-${i}`));
		for (let i = 0; i < workflowCount; i++) {
			const project = projects[i % projects.length];
			const workflow = await createWorkflow({ name: `bench-${i}` }, project);
			workflows.push({
				id: workflow.id,
				name: workflow.name,
				projectId: project.id,
				entity: workflow,
			});
		}

		if (withLedgerIndexes) {
			const ledger = `"${tablePrefix}execution_ledger"`;
			await dataSource.query(
				`CREATE INDEX ON ${ledger} ("workflowId", "createdAt") WHERE "event" = 'started'`,
			);
			await dataSource.query(
				`CREATE INDEX ON ${ledger} ("projectId", "createdAt") WHERE "event" = 'started' AND "projectId" IS NOT NULL`,
			);
		}

		if (usesQuota) {
			const quotaService = Container.get(ExecutionQuotaService);
			for (const workflow of workflows) {
				await quotaService.setLimit(
					{ scopeType: 'workflow', scopeId: workflow.id },
					'month',
					1_000_000_000,
				);
			}
			if (bothScopes) {
				for (const project of projects) {
					await quotaService.setLimit(
						{ scopeType: 'project', scopeId: project.id },
						'month',
						1_000_000_000,
					);
				}
			}
		}
	}, 900_000);

	afterAll(async () => {
		await testDb.terminate();
	});

	const onSqlite = () => Container.get(GlobalConfig).database.type === 'sqlite';

	/** Postgres-style `$n` placeholders, rewritten for SQLite. */
	const query = async <T>(sql: string, params: unknown[] = []) => {
		if (!onSqlite()) return (await dataSource.query(sql, params)) as T;
		const ordered: unknown[] = [];
		const text = sql.replace(/\$(\d+)/g, (_, n: string) => {
			ordered.push(params[Number(n) - 1]);
			return '?';
		});
		return (await dataSource.query(text, ordered)) as T;
	};

	const insightsSuccessCount = async () => {
		const [{ total }] = await query<Array<{ total: string | null }>>(
			`SELECT SUM("value") AS total FROM "${tablePrefix}insights_by_period" WHERE "type" = 2`,
		);
		return Number(total ?? 0);
	};

	const bufferTable = () =>
		scenario === 'baseline'
			? `"${tablePrefix}workflow_statistics_delta"`
			: `"${tablePrefix}execution_ledger"`;

	// WAL and statement metrics are Postgres only; SQLite runs report latency and fold time.
	const dbCounters = async () => {
		if (onSqlite()) return { lsn: '0/0', xact_commit: '0', tup_inserted: '0', tup_deleted: '0' };
		const [row] = await query<
			Array<{ lsn: string; xact_commit: string; tup_inserted: string; tup_deleted: string }>
		>(
			`SELECT pg_current_wal_lsn()::text AS lsn, xact_commit, tup_inserted, tup_deleted
			FROM pg_stat_database WHERE datname = current_database()`,
		);
		return row;
	};

	it(`records executions under load (${scenario}, ${workflowCount} workflows, concurrency ${concurrency})`, async () => {
		const statsRepository = Container.get(WorkflowStatisticsRepository);
		const ledgerRepository = Container.get(ExecutionLedgerRepository);
		const quotaService = Container.get(ExecutionQuotaService);
		const foldService = Container.get(ExecutionLedgerFoldService);
		const rollupService = Container.get(WorkflowStatisticsRollupService);
		const activeExecutions = Container.get(ActiveExecutions);
		const statisticsService = Container.get(WorkflowStatisticsService);
		const executionPersistence = Container.get(ExecutionPersistence);

		const fold = async (signal: AbortSignal, budgetMs?: number) =>
			scenario === 'baseline'
				? await rollupService.rollup(signal, budgetMs)
				: await foldService.fold(signal, budgetMs);

		const totalLatencies: number[] = [];
		const admitLatencies: number[] = [];
		const finishLatencies: number[] = [];
		const foldRuns: number[] = [];
		const backlog: number[] = [];
		let errors = 0;

		await new Promise((resolve) => setTimeout(resolve, 3000)); // let pg stats settle
		if (!onSqlite()) {
			await query('CREATE EXTENSION IF NOT EXISTS pg_stat_statements');
			await query('SELECT pg_stat_statements_reset()');
		}
		const before = await dbCounters();
		mkdirSync(outDir, { recursive: true });
		// Lets the runner sample Postgres CPU only while the load runs.
		writeFileSync(join(outDir, 'phase'), 'load');
		const startedAt = performance.now();
		const deadline = startedAt + durationMs;
		const controller = new AbortController();

		const foldLoop = (async () => {
			while (performance.now() < deadline) {
				const t0 = performance.now();
				await fold(controller.signal, Math.max(foldIntervalMs - 1000, foldIntervalMs * 0.8));
				foldRuns.push(performance.now() - t0);
				const wait = foldIntervalMs - (performance.now() - t0);
				if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
			}
		})();

		const sampler = (async () => {
			while (performance.now() < deadline) {
				const [{ n }] = await query<Array<{ n: number }>>(
					`SELECT CAST(COUNT(*) AS INTEGER) AS n FROM ${bufferTable()}`,
				);
				backlog.push(n);
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}
		})();

		const worker = async (index: number) => {
			const intervalMs = targetRate ? (concurrency / targetRate) * 1000 : 0;
			let nextAt = startedAt + (intervalMs * index) / concurrency;
			while (performance.now() < deadline) {
				if (targetRate) {
					const wait = nextAt - performance.now();
					if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
					nextAt += intervalMs;
				}
				const workflow = workflows[Math.floor(Math.random() * workflows.length)];
				const t0 = performance.now();
				try {
					if (withExecution) {
						const executionId = await activeExecutions.add({
							executionMode: 'webhook',
							workflowData: workflow.entity,
							projectId: workflow.projectId,
							executionData: createEmptyRunExecutionData(),
						});
						admitLatencies.push(performance.now() - t0);
						const t1 = performance.now();
						await executionPersistence.updateExistingExecution(executionId, {
							status: 'success',
							finished: true,
							stoppedAt: new Date(),
							data: createEmptyRunExecutionData(),
						});
						if (insightsSource) {
							const stoppedAt = new Date();
							const runData: IRun = {
								data: createEmptyRunExecutionData(),
								mode: 'webhook',
								status: 'success',
								startedAt: new Date(stoppedAt.getTime() - (performance.now() - t0)),
								stoppedAt,
								storedAt: 'db',
							};
							await statisticsService.workflowExecutionCompleted(workflow.entity, runData);
							if (insightsSource === 'raw') {
								await collectInsights({
									type: 'workflowExecuteAfter',
									workflow: workflow.entity,
									mode: 'webhook',
									runData,
									newStaticData: {},
									executionId,
									executedInThisProcess: true,
								});
							}
						} else {
							await ledgerRepository.appendFinished({
								workflowId: workflow.id,
								workflowName: workflow.name,
								mode: 'webhook',
								status: 'success',
								source: null,
							});
						}
						activeExecutions.finalizeExecution(executionId);
						finishLatencies.push(performance.now() - t1);
					} else if (scenario === 'baseline') {
						await statsRepository.appendIncrement(
							StatisticsNames.productionSuccess,
							workflow.id,
							true,
							workflow.name,
						);
					} else {
						if (scenario === 'quota-write-only') {
							await ledgerRepository.appendStarted({
								workflowId: workflow.id,
								projectId: workflow.projectId,
								mode: 'webhook',
							});
							admitLatencies.push(performance.now() - t0);
						} else if (usesQuota) {
							await quotaService.admit({
								workflowId: workflow.id,
								projectId: workflow.projectId,
								mode: 'webhook',
							});
							admitLatencies.push(performance.now() - t0);
						}
						const t1 = performance.now();
						await ledgerRepository.appendFinished({
							workflowId: workflow.id,
							workflowName: workflow.name,
							mode: 'webhook',
							status: 'success',
							source: null,
						});
						finishLatencies.push(performance.now() - t1);
					}
					totalLatencies.push(performance.now() - t0);
				} catch {
					errors++;
				}
			}
		};

		await Promise.all(Array.from({ length: concurrency }, async (_, i) => await worker(i)));
		const loadMs = performance.now() - startedAt;
		writeFileSync(join(outDir, 'phase'), 'idle');
		await Promise.all([foldLoop, sampler]);
		const statements = onSqlite()
			? []
			: await query<
					Array<{
						query: string;
						calls: string;
						total_ms: number;
						mean_ms: number;
						blks_per_call: number;
						wal_per_call: number;
					}>
				>(
					`SELECT LEFT(REGEXP_REPLACE(query, '\\s+', ' ', 'g'), 110) AS query, calls,
					ROUND(total_exec_time::numeric, 0)::float AS total_ms,
					ROUND(mean_exec_time::numeric, 3)::float AS mean_ms,
					ROUND(((shared_blks_hit + shared_blks_read)::numeric / GREATEST(calls, 1)), 1)::float AS blks_per_call,
					ROUND((wal_bytes / GREATEST(calls, 1))::numeric, 0)::float AS wal_per_call
				FROM pg_stat_statements
				WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
				ORDER BY total_exec_time DESC LIMIT 12`,
				);

		let [{ n: remaining }] = await query<Array<{ n: number }>>(
			`SELECT CAST(COUNT(*) AS INTEGER) AS n FROM ${bufferTable()}`,
		);
		const backlogAtEnd = remaining;
		const drainStart = performance.now();
		while (remaining > 0) {
			await fold(controller.signal);
			[{ n: remaining }] = await query<Array<{ n: number }>>(
				`SELECT CAST(COUNT(*) AS INTEGER) AS n FROM ${bufferTable()}`,
			);
		}
		const drainMs = performance.now() - drainStart;

		// The raw path defers its bucket writes to compaction, so measure that work separately.
		const deferred = { compactionMs: 0, compactionWalBytesPerOp: 0 };
		if (insightsSource === 'raw') {
			await flushInsights();
			const [{ lsn: compactionStartLsn }] = onSqlite()
				? [{ lsn: '0/0' }]
				: await query<Array<{ lsn: string }>>('SELECT pg_current_wal_lsn()::text AS lsn');
			const compactionStart = performance.now();
			let rawLeft = Number.POSITIVE_INFINITY;
			while (rawLeft > 0) {
				await compactInsights(controller.signal);
				[{ n: rawLeft }] = await query<Array<{ n: number }>>(
					`SELECT CAST(COUNT(*) AS INTEGER) AS n FROM "${tablePrefix}insights_raw"`,
				);
			}
			deferred.compactionMs = Math.round(performance.now() - compactionStart);
			const [{ bytes }] = onSqlite()
				? [{ bytes: '0' }]
				: await query<Array<{ bytes: string }>>(
						'SELECT pg_wal_lsn_diff(pg_current_wal_lsn(), $1)::bigint AS bytes',
						[compactionStartLsn],
					);
			deferred.compactionWalBytesPerOp = Math.round(Number(bytes) / totalLatencies.length);
		}

		await new Promise((resolve) => setTimeout(resolve, 2000)); // let pg stats settle
		const after = await dbCounters();
		const [{ wal_bytes }] = onSqlite()
			? [{ wal_bytes: '0' }]
			: await query<Array<{ wal_bytes: string }>>(
					'SELECT pg_wal_lsn_diff($1, $2)::bigint AS wal_bytes',
					[after.lsn, before.lsn],
				);

		const ops = totalLatencies.length;
		const [{ folded }] = await query<Array<{ folded: string | null }>>(
			`SELECT SUM("count") AS folded FROM "${tablePrefix}workflow_statistics" WHERE "name" = $1`,
			[StatisticsNames.productionSuccess],
		);
		const usage = usesQuota
			? await query<Array<{ used: string | null }>>(
					`SELECT SUM("used") AS used FROM "${tablePrefix}execution_quota_usage" WHERE "scopeType" = 'workflow'`,
				)
			: [{ used: null }];

		const result = {
			scenario,
			workflows: workflowCount,
			concurrency,
			targetRate: targetRate ?? null,
			durationS: Math.round(loadMs / 100) / 10,
			ops,
			errors,
			throughputPerS: Math.round(ops / (loadMs / 1000)),
			latencyMs: {
				total: summarize(totalLatencies),
				admit: summarize(admitLatencies),
				finish: summarize(finishLatencies),
			},
			fold: {
				runs: foldRuns.length,
				runMs: summarize(foldRuns),
				maxBacklog: Math.max(0, ...backlog),
				backlogAtEnd,
				drainMs: Math.round(drainMs),
			},
			db: {
				walMB: Math.round(Number(wal_bytes) / 1024 / 1024),
				walBytesPerOp: Math.round(Number(wal_bytes) / ops),
				insertsPerOp:
					Math.round(((Number(after.tup_inserted) - Number(before.tup_inserted)) / ops) * 100) /
					100,
			},
			statements,
			deferred,
			correctness: {
				insightsSuccess: insightsSource ? await insightsSuccessCount() : null,
				statisticsCount: Number(folded ?? 0),
				quotaUsage: usage[0].used === null ? null : Number(usage[0].used),
			},
		};

		mkdirSync(outDir, { recursive: true });
		writeFileSync(
			join(
				outDir,
				`${scenario}-wf${workflowCount}-c${concurrency}-r${targetRate ?? 'max'}-f${foldIntervalMs}.json`,
			),
			JSON.stringify(result, null, 2),
		);
		console.log(JSON.stringify(result));

		expect(errors).toBe(0);
		expect(result.correctness.statisticsCount).toBe(ops);
		if (insightsSource && insightsSource !== 'off') {
			expect(result.correctness.insightsSuccess).toBe(ops);
		}
		if (usesQuota) expect(result.correctness.quotaUsage).toBe(ops);
	}, 1_800_000);
});
