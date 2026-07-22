import { testDb } from '@n8n/backend-test-utils';
import {
	ScheduledJob,
	ScheduledJobRepository,
	ScheduledTask,
	ScheduledTaskRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import type { QueryDeepPartialEntity } from '@n8n/typeorm/query-builder/QueryPartialEntity';
import { performance } from 'node:perf_hooks';

/**
 * Query-level performance profiling for `ScheduledJobRepository` and
 * `ScheduledTaskRepository`.
 * Where the operator suite (`scheduler-benchmarks.test.ts`) answers "is throughput enough?", this one
 * profiles the individual repository queries against a large, realistically-shaped
 * table to produce per-query KPIs AND surface optimization options:
 *   - LATENCY: p50/p95/p99 of each hot query, called through the real repository.
 *   - PLANS: the `EXPLAIN` plan of each hot read, flagged INDEX vs FULL SCAN, so a
 *     missing/unused index or a query worth rewriting shows up directly.
 *
 * A "FULL SCAN" line is an optimization candidate (add/adjust an index, rewrite
 * the query, or tune a DB config); it is reported, not asserted, because the fix
 * is a judgement call. Hard assertions cover only correctness and a loose latency
 * ceiling that trips on a catastrophic regression.
 *
 *   N8N_SCHEDULER_BENCHMARK=1 pnpm --filter n8n test:sqlite scheduler-query-benchmarks
 *   N8N_SCHEDULER_BENCHMARK=1 pnpm --filter n8n test:postgres:integration:tc scheduler-query-benchmarks
 */

const runBenchmarks = process.env.N8N_SCHEDULER_BENCHMARK === '1';

const isPostgres = process.env.DB_TYPE === 'postgresdb';
const dialect = isPostgres ? 'postgres' : 'sqlite';

const envInt = (name: string, fallback: number): number => {
	const raw = process.env[name];
	const parsed = raw !== undefined ? Number(raw) : NaN;
	return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const TASK_TYPE = 'scheduleTrigger';

const TASK_ROWS = envInt('N8N_SCHEDULER_QUERY_TASK_ROWS', 100_000);
const JOB_ROWS = envInt('N8N_SCHEDULER_QUERY_JOB_ROWS', 50_000);
const READ_ITERS = envInt('N8N_SCHEDULER_QUERY_ITERS', 50);
// Writes mutate the table, so each iteration uses a fresh, conflict-free batch and
// fewer iterations than reads. 25 keeps p95/p99 distinct without growing the table
// enough to skew later iterations.
const WRITE_ITERS = envInt('N8N_SCHEDULER_QUERY_WRITE_ITERS', 25);
const BATCH = envInt('N8N_SCHEDULER_QUERY_BATCH', 100);
const WRITE_BATCH = envInt('N8N_SCHEDULER_QUERY_WRITE_BATCH', 10_000);

// `insertMany` chunks its insert and `name IN (...)` read-back internally (dialect-aware,
// clamped), so any batch is safe; these sizes just shape the benchmark's write workload.
const WRITE_JOB_BATCH = envInt('N8N_SCHEDULER_QUERY_WRITE_JOB_BATCH', isPostgres ? 5_000 : 800);
// Mirrors `advanceMany`'s own dialect-aware default (it clamps oversized values), sizing the
// benchmark's advance batches.
const ADVANCE_CHUNK = isPostgres ? 1_000 : 200;
// Loose catastrophic-regression guards.
const READ_MAX_P99_MS = envInt('N8N_SCHEDULER_QUERY_READ_MAX_P99_MS', 2_000);
const WRITE_MIN_RPS = envInt('N8N_SCHEDULER_QUERY_WRITE_MIN_RPS', 500);

const INSERT_CHUNK = 500;
const TEST_TIMEOUT_MS = 600_000;

const commas = (n: number) => Math.round(n).toLocaleString('en-US');

const percentiles = (samples: number[]) => {
	const sorted = [...samples].sort((a, b) => a - b);
	const at = (p: number) =>
		sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
	return { p50: at(50), p95: at(95), p99: at(99) };
};

const report = (title: string, lines: Record<string, string | number>) => {
	const body = Object.entries(lines)
		.map(([k, v]) => `    ${k}: ${v}`)
		.join('\n');
	// eslint-disable-next-line no-console
	console.log(`\n  [scheduler-query · ${dialect}] ${title}\n${body}\n`);
};

describe.runIf(runBenchmarks)('durable scheduler query benchmarks', () => {
	let dataSource: DataSource;
	let jobRepository: ScheduledJobRepository;
	let taskRepository: ScheduledTaskRepository;
	let taskTable: string;
	const optimizationCandidates: string[] = [];

	const secondsAgo = (seconds: number) => new Date(Date.now() - seconds * 1000);
	const secondsFromNow = (seconds: number) => new Date(Date.now() + seconds * 1000);

	async function bulkInsert<T>(
		entity: new () => T,
		rows: Array<QueryDeepPartialEntity<T>>,
	): Promise<void> {
		for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
			await dataSource
				.createQueryBuilder()
				.insert()
				.into(entity)
				.values(rows.slice(i, i + INSERT_CHUNK))
				.orIgnore()
				.execute();
		}
	}

	/**
	 * Seed a realistically mixed task table: mostly terminal history (what
	 * retention hasn't pruned yet), a slice of pending (some due, some future), and
	 * some running (some with expired leases). This is the shape the partial indexes
	 * are meant to keep cheap to query.
	 */
	async function seedTasks(jobId: number): Promise<void> {
		const base = secondsAgo(TASK_ROWS + 10).getTime();
		const rows: Array<QueryDeepPartialEntity<ScheduledTask>> = [];
		for (let i = 0; i < TASK_ROWS; i++) {
			const when = new Date(base + i * 1000);
			const row: QueryDeepPartialEntity<ScheduledTask> = {
				jobId,
				taskType: TASK_TYPE,
				payload: {},
				scheduledFor: when,
				runAt: when,
				maxAttempts: 1,
			};
			const bucket = i % 10;
			if (bucket <= 3) {
				Object.assign(row, { status: 'succeeded', finishedAt: secondsAgo(3600) });
			} else if (bucket === 4) {
				Object.assign(row, { status: 'failed', finishedAt: secondsAgo(3600) });
			} else if (bucket <= 7) {
				Object.assign(row, { status: 'pending', runAt: secondsFromNow(3600) });
			} else if (bucket === 8) {
				Object.assign(row, { status: 'pending', runAt: secondsAgo(60) }); // due
			} else {
				Object.assign(row, {
					status: 'running',
					claimedBy: 'seed',
					leaseExpiresAt: i % 2 === 0 ? secondsAgo(60) : secondsFromNow(60), // some expired
				});
			}
			rows.push(row);
		}
		await bulkInsert(ScheduledTask, rows);
	}

	/** Seed a mixed job table: ~60% enabled, of which ~1/3 are currently due. */
	async function seedJobs(): Promise<void> {
		const rows: Array<QueryDeepPartialEntity<ScheduledJob>> = [];
		for (let i = 0; i < JOB_ROWS; i++) {
			const enabled = i % 10 < 6;
			const due = enabled && i % 3 === 0;
			rows.push({
				name: `seed-job-${i}`,
				workflowId: null,
				nodeId: null,
				taskType: TASK_TYPE,
				payload: {},
				kind: 'interval',
				intervalSeconds: 60,
				enabled,
				nextRunAt: enabled ? (due ? secondsAgo(60) : secondsFromNow(3600)) : null,
				maxAttempts: 1,
			});
		}
		await bulkInsert(ScheduledJob, rows);
	}

	beforeAll(async () => {
		await testDb.init();
		dataSource = Container.get(DataSource);
		jobRepository = Container.get(ScheduledJobRepository);
		taskRepository = Container.get(ScheduledTaskRepository);
		taskTable = dataSource.getMetadata(ScheduledTask).tablePath;

		await testDb.truncate(['ScheduledTask', 'ScheduledJob']);
		const anchorJob = await jobRepository.save(
			jobRepository.create({
				name: 'query-bench-anchor',
				workflowId: null,
				nodeId: null,
				taskType: TASK_TYPE,
				payload: {},
				kind: 'interval',
				intervalSeconds: 60,
				enabled: true,
				nextRunAt: secondsAgo(60),
				maxAttempts: 1,
			}),
		);
		await seedTasks(anchorJob.id);
		await seedJobs();
		report('corpus seeded', {
			'scheduled_task rows': commas(TASK_ROWS),
			'scheduled_job rows': commas(JOB_ROWS),
		});
	}, TEST_TIMEOUT_MS);

	afterAll(async () => {
		if (optimizationCandidates.length > 0) {
			report('OPTIMIZATION CANDIDATES (queries not using an index)', {
				queries: optimizationCandidates.join('; '),
				note: 'consider an index/query rewrite/config change for these',
			});
		}
		await testDb.terminate();
	});

	/** Median/p95/p99 latency of `fn` over READ_ITERS runs (one warmup discarded). */
	async function measure(fn: () => Promise<unknown>) {
		await fn();
		const samples: number[] = [];
		for (let i = 0; i < READ_ITERS; i++) {
			const t0 = performance.now();
			await fn();
			samples.push(performance.now() - t0);
		}
		return percentiles(samples);
	}

	/**
	 * Per-batch latency of a write over WRITE_ITERS runs (iteration 0 is a discarded
	 * warmup). `fn` receives the iteration index so callers can namespace keys and
	 * keep every batch conflict-free.
	 */
	async function measureWrite(fn: (iter: number) => Promise<void>) {
		await fn(0);
		const samples: number[] = [];
		for (let i = 1; i <= WRITE_ITERS; i++) {
			const t0 = performance.now();
			await fn(i);
			samples.push(performance.now() - t0);
		}
		return percentiles(samples);
	}

	/** Report a write like a read: per-batch latency percentiles + throughput at p50. */
	function reportWrite(label: string, batch: number, latency: ReturnType<typeof percentiles>) {
		const rpsAtP50 = Math.round(batch / (latency.p50 / 1000));
		report(`WRITE · ${label}`, {
			'batch size (rows)': commas(batch),
			'latency p50/p95/p99 (ms)': `${latency.p50.toFixed(2)} / ${latency.p95.toFixed(2)} / ${latency.p99.toFixed(2)}`,
			'throughput @ p50 (rows/sec)': commas(rpsAtP50),
		});
		return rpsAtP50;
	}

	/** Run EXPLAIN for `sql`, return the plan text and whether it uses an index. */
	async function explain(
		sql: string,
		params: unknown[],
	): Promise<{ text: string; usesIndex: boolean }> {
		const rows = await dataSource.query<Array<Record<string, unknown>>>(
			`${isPostgres ? 'EXPLAIN' : 'EXPLAIN QUERY PLAN'} ${sql}`,
			params,
		);
		if (isPostgres) {
			const text = rows.map((r) => String(r['QUERY PLAN'])).join('\n');
			return { text, usesIndex: !/Seq Scan/i.test(text) };
		}
		const text = rows.map((r) => String(r.detail)).join(' | ');
		return { text, usesIndex: /USING (COVERING )?INDEX|SEARCH/i.test(text) };
	}

	/** Profile one read: latency via the real method, plan via an equivalent query. */
	async function profileRead(
		label: string,
		run: () => Promise<unknown>,
		planSql: string,
		planParams: unknown[],
	) {
		const latency = await measure(run);
		const plan = await explain(planSql, planParams);
		const verdict = plan.usesIndex ? 'uses index' : 'FULL SCAN — optimization candidate';
		if (!plan.usesIndex) optimizationCandidates.push(label);
		report(`READ · ${label}`, {
			'latency p50/p95/p99 (ms)': `${latency.p50.toFixed(2)} / ${latency.p95.toFixed(2)} / ${latency.p99.toFixed(2)}`,
			plan: plan.text.replace(/\s+/g, ' ').slice(0, 300),
			VERDICT: verdict,
		});
		expect(latency.p99).toBeLessThanOrEqual(READ_MAX_P99_MS);
		return latency;
	}

	it(
		'profiles the read hot paths (latency + query plans)',
		async () => {
			const dueParam = secondsAgo(1);

			// ScheduledTaskRepository.getMetricSnapshot — the Prometheus scrape read.
			await profileRead(
				'ScheduledTask.getMetricSnapshot',
				async () => await taskRepository.getMetricSnapshot(),
				`SELECT COUNT(*) AS pending,
				        COUNT(*) FILTER (WHERE "runAt" <= CURRENT_TIMESTAMP) AS due,
				        MIN("runAt") FILTER (WHERE "runAt" <= CURRENT_TIMESTAMP) AS "oldestDueRunAt",
				        (SELECT COUNT(*) FROM ${taskTable} WHERE "status" = 'running') AS running
				 FROM ${taskTable}
				 WHERE "status" = 'pending'`,
				[],
			);

			// ScheduledTaskRepository.claimDueTasks — the claim's candidate select
			// (pending + due, ordered by runAt). Backed by the partial index on runAt.
			await profileRead(
				'ScheduledTask.claimDueTasks (candidate select)',
				async () =>
					await taskRepository.claimDueTasks({
						host: 'query-bench',
						taskTypes: [TASK_TYPE],
						lookaheadMs: 0,
						leaseMs: 60_000,
						batchSize: BATCH,
					}),
				dataSource
					.createQueryBuilder(ScheduledTask, 't')
					.where('t.status = :s', { s: 'pending' })
					.andWhere('t.taskType IN (:...tt)', { tt: [TASK_TYPE] })
					.andWhere('t.runAt <= :now', { now: dueParam })
					.orderBy('t.runAt', 'ASC')
					.limit(BATCH)
					.getQueryAndParameters()[0],
				dataSource
					.createQueryBuilder(ScheduledTask, 't')
					.where('t.status = :s', { s: 'pending' })
					.andWhere('t.taskType IN (:...tt)', { tt: [TASK_TYPE] })
					.andWhere('t.runAt <= :now', { now: dueParam })
					.orderBy('t.runAt', 'ASC')
					.limit(BATCH)
					.getQueryAndParameters()[1],
			);

			// ScheduledTaskRepository.findExpiredLeases — reaper sweep. Backed by the
			// partial index on leaseExpiresAt WHERE status = 'running'.
			await profileRead(
				'ScheduledTask.findExpiredLeases',
				async () => await taskRepository.findExpiredLeases(BATCH),
				dataSource
					.createQueryBuilder(ScheduledTask, 't')
					.where('t.status = :s', { s: 'running' })
					.andWhere('t.leaseExpiresAt < :now', { now: dueParam })
					.orderBy('t.leaseExpiresAt', 'ASC')
					.limit(BATCH)
					.getQueryAndParameters()[0],
				dataSource
					.createQueryBuilder(ScheduledTask, 't')
					.where('t.status = :s', { s: 'running' })
					.andWhere('t.leaseExpiresAt < :now', { now: dueParam })
					.orderBy('t.leaseExpiresAt', 'ASC')
					.limit(BATCH)
					.getQueryAndParameters()[1],
			);

			// ScheduledTaskRepository.deleteFinishedOlderThan — retention's candidate
			// select. Backed by the partial index on finishedAt WHERE finishedAt IS NOT NULL.
			await profileRead(
				'ScheduledTask.deleteFinishedOlderThan (candidate select)',
				async () =>
					await dataSource
						.createQueryBuilder(ScheduledTask, 't')
						.where('t.status IN (:...s)', { s: ['succeeded', 'failed', 'cancelled', 'missed'] })
						.andWhere('t.finishedAt <= :cutoff', { cutoff: dueParam })
						.orderBy('t.finishedAt', 'ASC')
						.limit(BATCH)
						.getMany(),
				dataSource
					.createQueryBuilder(ScheduledTask, 't')
					.where('t.status IN (:...s)', { s: ['succeeded', 'failed', 'cancelled', 'missed'] })
					.andWhere('t.finishedAt <= :cutoff', { cutoff: dueParam })
					.orderBy('t.finishedAt', 'ASC')
					.limit(BATCH)
					.getQueryAndParameters()[0],
				dataSource
					.createQueryBuilder(ScheduledTask, 't')
					.where('t.status IN (:...s)', { s: ['succeeded', 'failed', 'cancelled', 'missed'] })
					.andWhere('t.finishedAt <= :cutoff', { cutoff: dueParam })
					.orderBy('t.finishedAt', 'ASC')
					.limit(BATCH)
					.getQueryAndParameters()[1],
			);

			// ScheduledJobRepository.claimDue — materializer's due-job read. Backed by
			// the partial index on nextRunAt WHERE enabled AND nextRunAt IS NOT NULL.
			await profileRead(
				'ScheduledJob.claimDue',
				// Wrapped in a transaction: on Postgres claimDue takes FOR UPDATE SKIP
				// LOCKED, which requires one (this is how the materializer calls it).
				async () =>
					await dataSource.transaction(async (trx) => await jobRepository.claimDue(trx, BATCH)),
				dataSource
					.createQueryBuilder(ScheduledJob, 'job')
					.where('job.enabled = :e', { e: true })
					.andWhere('job.nextRunAt IS NOT NULL')
					.andWhere('job.nextRunAt <= :now', { now: dueParam })
					.orderBy('job.nextRunAt', 'ASC')
					.limit(BATCH)
					.getQueryAndParameters()[0],
				dataSource
					.createQueryBuilder(ScheduledJob, 'job')
					.where('job.enabled = :e', { e: true })
					.andWhere('job.nextRunAt IS NOT NULL')
					.andWhere('job.nextRunAt <= :now', { now: dueParam })
					.orderBy('job.nextRunAt', 'ASC')
					.limit(BATCH)
					.getQueryAndParameters()[1],
			);
		},
		TEST_TIMEOUT_MS,
	);

	it(
		'measures the write hot paths (latency + throughput)',
		async () => {
			const anchor = await jobRepository.findOneByOrFail({ name: 'query-bench-anchor' });

			// ScheduledTaskRepository.insertIgnoringDuplicates — materializer insert.
			// Each iteration inserts into a disjoint time window so no `(jobId, scheduledFor)`
			// collides and every row is recorded.
			let lastRecorded = 0;
			const insertLatency = await measureWrite(async (iter) => {
				const base = secondsFromNow(10 + iter * (WRITE_BATCH + 10)).getTime();
				const occurrences = Array.from({ length: WRITE_BATCH }, (_, i) => {
					const when = new Date(base + i * 1000);
					return {
						jobId: anchor.id,
						taskType: TASK_TYPE,
						payload: {},
						scheduledFor: when,
						runAt: when,
						maxAttempts: 1,
					};
				});
				const inserted = await dataSource.transaction(
					async (trx) => await taskRepository.insertIgnoringDuplicates(trx, occurrences),
				);
				lastRecorded = inserted.recorded;
			});
			const taskInsertRps = reportWrite(
				'ScheduledTask.insertIgnoringDuplicates',
				WRITE_BATCH,
				insertLatency,
			);

			// ScheduledJobRepository.insertMany — provisioning insert + read-back by name.
			// Names are namespaced per iteration to stay unique; ids are kept for advanceMany.
			const jobIdBatches = new Map<number, number[]>();
			let lastIds: number[] = [];
			const insertManyLatency = await measureWrite(async (iter) => {
				const newJobs = Array.from({ length: WRITE_JOB_BATCH }, (_, i) => ({
					name: `write-bench-job-${iter}-${i}`,
					workflowId: null,
					nodeId: null,
					taskType: TASK_TYPE,
					payload: {},
					kind: 'interval' as const,
					cronExpression: null,
					timezone: null,
					recurrenceUnit: null,
					recurrenceSize: null,
					intervalSeconds: 60,
					fireAt: null,
					nextRunAt: secondsFromNow(3600),
					maxAttempts: 1,
				}));
				const ids = await dataSource.transaction(
					async (trx) => await jobRepository.insertMany(trx, newJobs),
				);
				jobIdBatches.set(iter, ids);
				lastIds = ids;
			});
			const jobInsertRps = reportWrite(
				'ScheduledJob.insertMany (+read-back)',
				WRITE_JOB_BATCH,
				insertManyLatency,
			);

			// ScheduledJobRepository.advanceMany — materializer clock advance (CASE update).
			// Advances the ids inserted by the matching insertMany iteration.
			const advanceLatency = await measureWrite(async (iter) => {
				const ids = jobIdBatches.get(iter) ?? lastIds;
				const advances = ids.map((id) => ({
					id,
					nextRunAt: secondsFromNow(7200),
					lastFiredAt: secondsAgo(1),
				}));
				await dataSource.transaction(
					async (trx) => await jobRepository.advanceMany(trx, advances, ADVANCE_CHUNK),
				);
			});
			const advanceRps = reportWrite(
				'ScheduledJob.advanceMany (CASE update)',
				WRITE_JOB_BATCH,
				advanceLatency,
			);
			report('WRITE · notes', { 'advanceMany chunk (dialect-safe)': ADVANCE_CHUNK });

			expect(lastRecorded).toBe(WRITE_BATCH);
			expect(lastIds).toHaveLength(WRITE_JOB_BATCH);
			expect(taskInsertRps).toBeGreaterThanOrEqual(WRITE_MIN_RPS);
			expect(jobInsertRps).toBeGreaterThanOrEqual(WRITE_MIN_RPS);
			expect(advanceRps).toBeGreaterThanOrEqual(WRITE_MIN_RPS);
		},
		TEST_TIMEOUT_MS,
	);
});
