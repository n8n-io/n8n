import { testDb } from '@n8n/backend-test-utils';
import { DatabaseConfig } from '@n8n/config';
import type { ScheduledJob as ScheduledJobEntity } from '@n8n/db';
import {
	DbConnectionOptions,
	ScheduledJobRepository,
	ScheduledTask,
	ScheduledTaskRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import type { QueryDeepPartialEntity } from '@n8n/typeorm/query-builder/QueryPartialEntity';

/**
 * Durable-scheduler performance benchmarks (CAT-3623), written to answer the
 * questions an operator actually asks before turning this on:
 *
 *   1. CAPACITY    — how many schedule fires per second can one node handle?
 *   2. PUNCTUALITY — will my jobs fire on time when a lot come due at once?
 *   3. RECOVERY    — if a node dies mid-run, how fast does its work resume?
 *   4. HEALTH      — does the scheduler's table stay bounded (no DB bloat)?
 *
 * Each prints a plain-language VERDICT plus, where useful, a translation into
 * schedule counts, so the numbers can be read without knowing the internals.
 * Every KPI also asserts a hard correctness invariant (nothing lost, nothing run
 * twice) and a deliberately conservative floor/ceiling that only trips on a
 * catastrophic regression, not on slow-CI jitter.
 *
 * This is an opt-in suite: it seeds tens of thousands of rows and spins several
 * concurrent workers, too heavy and too timing-sensitive to run on every CI pass.
 * It sits with the other scheduling integration tests and reuses their scripts,
 * but stays dormant unless `N8N_SCHEDULER_BENCHMARK=1` is set, so the normal
 * `test:integration` run skips it. Opt in by setting the flag and filtering to
 * this file:
 *
 *   # SQLite (single-writer)
 *   N8N_SCHEDULER_BENCHMARK=1 pnpm --filter n8n test:sqlite scheduler-benchmarks
 *   # Postgres (SKIP LOCKED, dead-tuple churn) via testcontainers
 *   N8N_SCHEDULER_BENCHMARK=1 pnpm --filter n8n test:postgres:integration:tc scheduler-benchmarks
 *
 * Workload sizes and thresholds are overridable via env for beefier hosts
 * (see the constants below).
 */

// `runIf` keeps the file collectable but runs nothing (and skips the `beforeAll`
// DB init) unless the flag is set, so it costs the normal CI run nothing while
// needing no separate config or script.
const runBenchmarks = process.env.N8N_SCHEDULER_BENCHMARK === '1';

// SQLite serialises every writer through one lock; Postgres runs claims in
// parallel (SKIP LOCKED). Running both is the point — the operator numbers differ
// sharply, and that difference is what informs the min-interval / SQLite-cadence
// decision.
const isPostgres = process.env.DB_TYPE === 'postgresdb';
const dialect = isPostgres ? 'postgres' : 'sqlite';

// Postgres runs N independent instances; SQLite funnels N concurrent callers
// through one shared writer (multi-main needs Postgres). Label the report so raw
// output isn't misread as "SQLite instances beat Postgres instances".
const instancesLabel = isPostgres ? 'instances' : 'workers (1 shared writer)';
const recoveringLabel = isPostgres
	? 'recovering instances'
	: 'recovering workers (1 shared writer)';

const envInt = (name: string, fallback: number): number => {
	const raw = process.env[name];
	const parsed = raw !== undefined ? Number(raw) : NaN;
	return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const TASK_TYPE = 'scheduleTrigger';

// Rows one claim statement takes (shared by every KPI).
const CLAIM_BATCH = envInt('N8N_SCHEDULER_BENCHMARK_BATCH', 100);

// KPI 1 — Capacity: schedule fires/sec one node processes end-to-end.
const CAPACITY_WORKERS = envInt('N8N_SCHEDULER_BENCHMARK_CAPACITY_WORKERS', 8);
const CAPACITY_BACKLOG = envInt('N8N_SCHEDULER_BENCHMARK_CAPACITY_BACKLOG', 50_000);
const CAPACITY_MIN_FPS = envInt('N8N_SCHEDULER_BENCHMARK_CAPACITY_MIN_FPS', 50);

// KPI 2 — Punctuality: how late fires are when a burst comes due at once.
const PUNCTUALITY_WORKERS = envInt('N8N_SCHEDULER_BENCHMARK_PUNCTUALITY_WORKERS', 8);
const PUNCTUALITY_BURST = envInt('N8N_SCHEDULER_BENCHMARK_PUNCTUALITY_BURST', 20_000);
// The scheduler itself warns when a task fires >30s late; use that as the ceiling.
const PUNCTUALITY_MAX_P99_MS = envInt('N8N_SCHEDULER_BENCHMARK_PUNCTUALITY_MAX_P99_MS', 30_000);

// KPI 3 — Crash recovery: time to resume a dead node's in-flight work.
const RECOVERY_WORKERS = envInt('N8N_SCHEDULER_BENCHMARK_RECOVERY_WORKERS', 8);
const RECOVERY_STRANDED = envInt('N8N_SCHEDULER_BENCHMARK_RECOVERY_STRANDED', 20_000);
const RECOVERY_MAX_SECONDS = envInt('N8N_SCHEDULER_BENCHMARK_RECOVERY_MAX_SECONDS', 120);

// KPI 4 — Health: the table stays bounded under sustained high-frequency churn,
// with retention pruning *concurrently* with live churn (not a serial post-batch
// sweep). Total fires = CHURN_CYCLES × CHURN_BATCH.
const CHURN_WORKERS = envInt('N8N_SCHEDULER_BENCHMARK_CHURN_WORKERS', 8);
const CHURN_CYCLES = envInt('N8N_SCHEDULER_BENCHMARK_CHURN_CYCLES', 20);
const CHURN_BATCH = envInt('N8N_SCHEDULER_BENCHMARK_CHURN_BATCH', 5_000);
const CHURN_MIN_FPS = envInt('N8N_SCHEDULER_BENCHMARK_CHURN_MIN_FPS', 50);
// Retention runs as its own loop: prune a bounded batch on a fixed cadence,
// racing live inserts/claims/fires — the shape the shipped retention job has.
const CHURN_RETENTION_LIMIT = envInt('N8N_SCHEDULER_BENCHMARK_CHURN_RETENTION_LIMIT', 1_000);
const CHURN_RETENTION_INTERVAL_MS = envInt(
	'N8N_SCHEDULER_BENCHMARK_CHURN_RETENTION_INTERVAL_MS',
	100,
);
const CHURN_SAMPLE_INTERVAL_MS = envInt('N8N_SCHEDULER_BENCHMARK_CHURN_SAMPLE_INTERVAL_MS', 50);
// Peak finished-but-unpruned rows allowed. If retention keeps pace this stays
// small (a sweep or two behind); crossing it means pruning fell behind and the
// table is bloating — the real failure this KPI guards against.
const CHURN_MAX_FINISHED_ROWS = envInt(
	'N8N_SCHEDULER_BENCHMARK_CHURN_MAX_FINISHED_ROWS',
	CHURN_BATCH,
);

const LEASE_MS = 60_000;
const BACKOFF_MS = 60_000;
// Rows per bulk INSERT statement (stays under the driver's bind-parameter ceiling).
const INSERT_CHUNK = 500;
// Rows per seeding transaction (each internally chunked into INSERT statements).
const SEED_TX_CHUNK = 5_000;
const TEST_TIMEOUT_MS = 600_000;

const sleep = async (ms: number) => await new Promise((resolve) => setTimeout(resolve, ms));

const commas = (n: number) => Math.round(n).toLocaleString('en-US');

/** p50/p95/p99 over per-item latency samples (ms). */
const percentiles = (samples: number[]) => {
	if (samples.length === 0) return { p50: 0, p95: 0, p99: 0 };
	const sorted = [...samples].sort((a, b) => a - b);
	// Nearest-rank: the p-th percentile is the ceil(p/100 · n)-th sample (1-based),
	// clamped into range. (Plain floor(p/100 · n) would return the max for round n.)
	const at = (p: number) => {
		const rank = Math.ceil((p / 100) * sorted.length);
		return sorted[Math.min(sorted.length - 1, Math.max(0, rank - 1))];
	};
	return { p50: at(50), p95: at(95), p99: at(99) };
};

const report = (title: string, lines: Record<string, string | number>) => {
	const body = Object.entries(lines)
		.map(([k, v]) => `    ${k}: ${v}`)
		.join('\n');
	// eslint-disable-next-line no-console
	console.log(`\n  [scheduler-benchmark · ${dialect}] ${title}\n${body}\n`);
};

describe.runIf(runBenchmarks)('durable scheduler benchmarks', () => {
	let dataSource: DataSource;
	let jobRepository: ScheduledJobRepository;
	let taskRepository: ScheduledTaskRepository;
	let databaseConfig: DatabaseConfig;

	beforeAll(async () => {
		await testDb.init();
		dataSource = Container.get(DataSource);
		jobRepository = Container.get(ScheduledJobRepository);
		taskRepository = Container.get(ScheduledTaskRepository);
		databaseConfig = Container.get(DatabaseConfig);
	});

	beforeEach(async () => {
		await testDb.truncate(['ScheduledTask', 'ScheduledJob']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	const secondsAgo = (seconds: number) => new Date(Date.now() - seconds * 1000);

	/** One interval job to hang the tasks off of (their `jobId`). */
	async function createJob(): Promise<ScheduledJobEntity> {
		return await jobRepository.save(
			jobRepository.create({
				name: `bench-${Math.random().toString(36).slice(2)}`,
				workflowId: null,
				nodeId: null,
				taskType: TASK_TYPE,
				payload: {},
				kind: 'interval',
				intervalSeconds: 1,
				enabled: true,
				nextRunAt: secondsAgo(1),
				maxAttempts: 1,
			}),
		);
	}

	/**
	 * `count` concurrent workers, modelled per dialect to match how each is really
	 * deployed:
	 *
	 * - **Postgres** supports multi-main, so each worker is its own `DataSource`
	 *   (one connection) — an independent instance. Claims run genuinely in
	 *   parallel and rely on `FOR UPDATE SKIP LOCKED` to stay disjoint.
	 * - **SQLite** is single-instance (multi-main needs Postgres). Its pooled driver
	 *   funnels every write through one mutex-guarded write connection, so the
	 *   workers share one `DataSource`: concurrent claims queue on that single
	 *   writer, which is the real bottleneck. Separate SQLite `DataSource`s would be
	 *   separate write connections fighting over the file lock (`SQLITE_BUSY`) — not
	 *   a real topology.
	 */
	async function createWorkers(count: number) {
		if (!isPostgres) {
			return {
				repos: Array.from({ length: count }, () => taskRepository),
				destroy: async () => {},
			};
		}
		const sources: DataSource[] = [];
		const repos: ScheduledTaskRepository[] = [];
		for (let i = 0; i < count; i++) {
			// One connection per instance: the test harness already caps the Postgres
			// pool at 1 (DB_POSTGRESDB_POOL_SIZE=1), so each DataSource is one instance.
			const ds = new DataSource(Container.get(DbConnectionOptions).getOptions());
			await ds.initialize();
			sources.push(ds);
			repos.push(new ScheduledTaskRepository(ds, databaseConfig));
		}
		return {
			repos,
			destroy: async () => await Promise.all(sources.map(async (ds) => await ds.destroy())),
		};
	}

	/**
	 * Bulk-insert task rows with explicit columns (status, lease, timestamps),
	 * chunked to stay under the driver's bind-parameter ceiling. Seeds lifecycle
	 * states the materializer path (which only ever inserts `pending`) can't.
	 */
	async function bulkInsert(rows: Array<QueryDeepPartialEntity<ScheduledTask>>): Promise<void> {
		for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
			await dataSource
				.createQueryBuilder()
				.insert()
				.into(ScheduledTask)
				.values(rows.slice(i, i + INSERT_CHUNK))
				.orIgnore()
				.execute();
		}
	}

	/** Seed `count` due `pending` tasks via the real materializer insert path. */
	async function seedDuePending(jobId: number, count: number, slotOffset = 0): Promise<void> {
		// `slotOffset` shifts the (jobId, scheduledFor) slots so cycles never collide
		// on the unique index even after a prior cycle's rows are pruned and re-used.
		const base = secondsAgo(5).getTime() - slotOffset * 1000;
		const occurrences = Array.from({ length: count }, (_, i) => {
			const when = new Date(base - i * 1000);
			return {
				jobId,
				taskType: TASK_TYPE,
				payload: {},
				scheduledFor: when,
				runAt: when,
				maxAttempts: 1,
			};
		});
		for (let i = 0; i < occurrences.length; i += SEED_TX_CHUNK) {
			await dataSource.transaction(
				async (trx) =>
					await taskRepository.insertIgnoringDuplicates(
						trx,
						occurrences.slice(i, i + SEED_TX_CHUNK),
					),
			);
		}
	}

	/**
	 * Run `repos` as concurrent workers claiming a backlog down to `target` rows.
	 * `onClaimed`, if given, does the per-batch work (mark started, complete, …).
	 * Returns the per-worker claim distribution.
	 */
	async function drainByClaiming(
		repos: ScheduledTaskRepository[],
		options: {
			target: number;
			onClaimed?: (
				rows: ScheduledTask[],
				worker: number,
				repo: ScheduledTaskRepository,
			) => Promise<void>;
		},
	) {
		const perWorker = new Array<number>(repos.length).fill(0);
		let claimed = 0;
		const start = Date.now();

		await Promise.all(
			repos.map(async (repo, index) => {
				const host = `bench-worker-${index}`;
				while (claimed < options.target && Date.now() - start < TEST_TIMEOUT_MS) {
					const rows = await repo.claimDueTasks({
						host,
						taskTypes: [TASK_TYPE],
						lookaheadMs: 0,
						leaseMs: LEASE_MS,
						batchSize: CLAIM_BATCH,
					});
					if (rows.length === 0) {
						await sleep(1);
						continue;
					}
					claimed += rows.length;
					perWorker[index] += rows.length;
					if (options.onClaimed) await options.onClaimed(rows, index, repo);
				}
			}),
		);

		return { perWorker, claimed };
	}

	/** Process one claimed task the way a fire does: mark dispatched, then complete. */
	async function fireTask(repo: ScheduledTaskRepository, row: ScheduledTask): Promise<number> {
		const ref = { id: row.id, host: row.claimedBy!, claimedEpoch: row.leaseEpoch };
		await repo.markDispatched(ref);
		return await repo.completeTask(ref);
	}

	// ── KPI 1 · CAPACITY ──────────────────────────────────────────────────────
	// "How many schedule fires per second can one node handle?"
	// Concurrent workers process a backlog of due schedules end-to-end (claim →
	// mark started → complete), the way a real fire touches the database. The
	// sustained fires/sec is the per-node budget: a fleet producing fewer fires/sec
	// than this stays drained; more, and the queue backs up. Translated into
	// schedule counts so it can be read against a real deployment.
	it(
		'CAPACITY — sustains enough schedule fires per second',
		async () => {
			const job = await createJob();
			await seedDuePending(job.id, CAPACITY_BACKLOG);

			const workers = await createWorkers(CAPACITY_WORKERS);
			let fired = 0;
			const start = Date.now();
			let end = start;
			try {
				await drainByClaiming(workers.repos, {
					target: CAPACITY_BACKLOG,
					onClaimed: async (rows, _worker, repo) => {
						for (const row of rows) {
							// Resolve before incrementing: `fired += await …` would read `fired`
							// before the await and write it back after, losing concurrent updates.
							const done = await fireTask(repo, row);
							fired += done;
						}
					},
				});
				// Stop the clock before teardown: closing the Postgres DataSources in the
				// finally is real work, but not part of firing throughput.
				end = Date.now();
			} finally {
				await workers.destroy();
			}

			const elapsedS = (end - start) / 1000;
			const firesPerSec = Math.round(CAPACITY_BACKLOG / elapsedS);
			const keepsUp = firesPerSec >= CAPACITY_MIN_FPS;

			report('KPI 1 · CAPACITY — schedule fires per second (one node)', {
				question: 'How many schedules can one node fire per second?',
				[instancesLabel]: CAPACITY_WORKERS,
				'schedules processed': commas(CAPACITY_BACKLOG),
				'time (s)': elapsedS.toFixed(2),
				'sustained fires/sec': commas(firesPerSec),
				'in practice': `~${commas(firesPerSec * 60)} schedules @ every 60s · ~${commas(firesPerSec * 10)} @ every 10s · ~${commas(firesPerSec)} @ every 1s`,
				VERDICT: keepsUp
					? `handles ~${commas(firesPerSec)} fires/sec per node`
					: `TOO SLOW (${commas(firesPerSec)} < ${CAPACITY_MIN_FPS} fires/sec floor)`,
			});

			// Correctness: every schedule fired exactly once (the DB agrees).
			expect(fired).toBe(CAPACITY_BACKLOG);
			expect(await taskRepository.countBy({ status: 'succeeded' })).toBe(CAPACITY_BACKLOG);
			expect(firesPerSec).toBeGreaterThanOrEqual(CAPACITY_MIN_FPS);
		},
		TEST_TIMEOUT_MS,
	);

	// ── KPI 2 · PUNCTUALITY ───────────────────────────────────────────────────
	// "Will my jobs fire on time when a lot come due at once?"
	// A burst of schedules all become due at the same instant (a thundering herd,
	// e.g. everything on a 0-minute cron). We measure, per schedule, how long after
	// becoming due it actually fired. The tail (p95/p99) is the worst-case lateness
	// an operator would see; the ceiling mirrors the scheduler's own >30s
	// late-dispatch warning.
	it(
		'PUNCTUALITY — fires on time under a due-at-once burst',
		async () => {
			const job = await createJob();
			await seedDuePending(job.id, PUNCTUALITY_BURST);

			const workers = await createWorkers(PUNCTUALITY_WORKERS);
			const latenessMs: number[] = [];
			// All schedules are treated as due from this instant; lateness is measured
			// from here, so it reflects dispatch queueing, not the seeding time.
			const dueAt = Date.now();
			try {
				await drainByClaiming(workers.repos, {
					target: PUNCTUALITY_BURST,
					onClaimed: async (rows, _worker, repo) => {
						for (const row of rows) {
							await fireTask(repo, row);
							latenessMs.push(Date.now() - dueAt);
						}
					},
				});
			} finally {
				await workers.destroy();
			}

			const { p50, p95, p99 } = percentiles(latenessMs);
			const onTime = p99 <= PUNCTUALITY_MAX_P99_MS;
			const secs = (ms: number) => (ms / 1000).toFixed(2);

			report('KPI 2 · PUNCTUALITY — how late fires are under a burst', {
				question: 'Will my jobs fire on time when many come due at once?',
				[instancesLabel]: PUNCTUALITY_WORKERS,
				'schedules due at once': commas(PUNCTUALITY_BURST),
				'fired late by — p50': `${secs(p50)}s`,
				'fired late by — p95': `${secs(p95)}s`,
				'fired late by — p99': `${secs(p99)}s`,
				VERDICT: onTime
					? `99% fired within ${secs(p99)}s of becoming due`
					: `TOO LATE (p99 ${secs(p99)}s > ${PUNCTUALITY_MAX_P99_MS / 1000}s)`,
			});

			// Correctness: the whole burst fired.
			expect(latenessMs.length).toBe(PUNCTUALITY_BURST);
			expect(await taskRepository.countBy({ status: 'succeeded' })).toBe(PUNCTUALITY_BURST);
			expect(p99).toBeLessThanOrEqual(PUNCTUALITY_MAX_P99_MS);
		},
		TEST_TIMEOUT_MS,
	);

	// ── KPI 3 · CRASH RECOVERY ────────────────────────────────────────────────
	// "If a node dies mid-run, how fast does its work resume?"
	// A crashed instance leaves its claimed schedules stuck `running` with expired
	// leases. We seed that state, then let healthy instances recover it, and report
	// the wall-clock time until every stranded schedule is runnable again. Each is
	// recovered exactly once (epoch-fenced), even with several instances sweeping at
	// once.
	it(
		'RECOVERY — resumes a crashed node’s work quickly',
		async () => {
			const job = await createJob();

			// The crashed node's in-flight work: `running`, lease already expired,
			// attempts left so recovery reclaims (rather than giving up).
			const expiredAt = secondsAgo(120);
			const scheduledBase = secondsAgo(3600).getTime();
			await bulkInsert(
				Array.from({ length: RECOVERY_STRANDED }, (_, i) => ({
					jobId: job.id,
					taskType: TASK_TYPE,
					payload: {},
					scheduledFor: new Date(scheduledBase - i * 1000),
					runAt: new Date(scheduledBase - i * 1000),
					status: 'running',
					claimedBy: 'crashed-node',
					leaseExpiresAt: expiredAt,
					attempts: 0,
					maxAttempts: 3,
					startedAt: expiredAt,
				})),
			);

			const workers = await createWorkers(RECOVERY_WORKERS);
			let recovered = 0;
			let sweeps = 0;
			const start = Date.now();
			let end = start;
			try {
				await Promise.all(
					workers.repos.map(async (repo) => {
						while (recovered < RECOVERY_STRANDED && Date.now() - start < TEST_TIMEOUT_MS) {
							// The sweep intentionally takes no row lock, so concurrent recoverers
							// can re-select the same row; the epoch-fenced update makes the loser a
							// benign no-op (see ScheduledTaskRepository).
							const expired = await repo.findExpiredLeases(CLAIM_BATCH);
							if (expired.length === 0) {
								await sleep(1);
								if (recovered >= RECOVERY_STRANDED) break;
								continue;
							}
							for (const row of expired) {
								sweeps += 1;
								// Resolve before incrementing (see fireTask loops): a `+= await …`
								// on a shared counter loses concurrent updates.
								const reclaimed = await repo.reclaimExpired(
									{ id: row.id, claimedEpoch: row.leaseEpoch },
									BACKOFF_MS,
									'recovery benchmark: lease expired',
								);
								recovered += reclaimed;
							}
						}
					}),
				);
				// Stop the clock before teardown (see CAPACITY): connection close isn't
				// part of recovery time.
				end = Date.now();
			} finally {
				await workers.destroy();
			}

			const elapsedS = (end - start) / 1000;
			const withinBudget = elapsedS <= RECOVERY_MAX_SECONDS;

			report('KPI 3 · RECOVERY — time to resume a crashed node’s work', {
				question: 'If a node dies mid-run, how fast does its work resume?',
				[recoveringLabel]: RECOVERY_WORKERS,
				'stranded schedules': commas(RECOVERY_STRANDED),
				'recovery time (s)': elapsedS.toFixed(2),
				'recovered/sec': commas(Math.round(recovered / elapsedS)),
				// Near the instance count = concurrent recoverers doing redundant sweeps.
				'wasted-sweep factor': (sweeps / Math.max(recovered, 1)).toFixed(1),
				VERDICT: withinBudget
					? `${commas(RECOVERY_STRANDED)} stranded schedules resumed in ${elapsedS.toFixed(1)}s`
					: `TOO SLOW (${elapsedS.toFixed(1)}s > ${RECOVERY_MAX_SECONDS}s budget)`,
			});

			// Correctness: every stranded schedule recovered exactly once and is
			// runnable again; nothing left stuck `running`.
			expect(recovered).toBe(RECOVERY_STRANDED);
			expect(await taskRepository.countBy({ status: 'pending' })).toBe(RECOVERY_STRANDED);
			expect(await taskRepository.countBy({ status: 'running' })).toBe(0);
			expect(elapsedS).toBeLessThanOrEqual(RECOVERY_MAX_SECONDS);
		},
		TEST_TIMEOUT_MS,
	);

	// ── KPI 4 · HEALTH ────────────────────────────────────────────────────────
	// "Does the scheduler's table stay bounded, or will it bloat the DB?"
	// Four loops run concurrently for the whole test — the way production actually
	// looks, with retention racing live churn rather than sweeping between batches:
	//
	//   • producer  — seeds due tasks, paced to hold the pending backlog near one
	//                 batch, so peak rows reflect steady state, not a producer that
	//                 outran the consumers;
	//   • consumers — claim + fire (insert → claim → mark started → complete);
	//   • retention — prunes a bounded batch of finished rows on a fixed cadence;
	//   • sampler   — records the high-water mark of live rows and, crucially, of
	//                 finished-but-unpruned rows (the actual bloat signal: dead
	//                 tuples on Postgres, file growth on SQLite).
	//
	// The KPI is whether retention *keeps pace* with concurrent churn: finished
	// rows must stay bounded (never accumulate toward the total fired). Serially
	// draining the table to zero after each batch would prove nothing about that.
	it(
		'HEALTH — keeps the table bounded under sustained concurrent churn',
		async () => {
			const job = await createJob();
			const workers = await createWorkers(CHURN_WORKERS);
			const totalFires = CHURN_CYCLES * CHURN_BATCH;

			let fired = 0;
			let seeded = 0;
			let peakLiveRows = 0;
			let peakFinishedRows = 0;
			let churnDone = false;

			const start = Date.now();
			let end = start;
			try {
				// Producer: seed continuously, but throttle on the pending backlog so
				// inflow tracks the fire rate. Distinct slot windows (seedChunk offset)
				// keep the (jobId, scheduledFor) unique index from colliding.
				const producer = (async () => {
					let seedChunk = 0;
					while (seeded < totalFires && Date.now() - start < TEST_TIMEOUT_MS) {
						const pending = await taskRepository.countBy({ status: 'pending' });
						if (pending >= CHURN_BATCH) {
							await sleep(5);
							continue;
						}
						const size = Math.min(CHURN_BATCH, totalFires - seeded);
						await seedDuePending(job.id, size, seedChunk * CHURN_BATCH);
						seeded += size;
						seedChunk += 1;
					}
				})();

				// Consumers: claim + fire until the whole workload has fired.
				const consumers = workers.repos.map(async (repo, index) => {
					const host = `bench-churn-${index}`;
					while (fired < totalFires && Date.now() - start < TEST_TIMEOUT_MS) {
						const rows = await repo.claimDueTasks({
							host,
							taskTypes: [TASK_TYPE],
							lookaheadMs: 0,
							leaseMs: LEASE_MS,
							batchSize: CLAIM_BATCH,
						});
						if (rows.length === 0) {
							await sleep(1);
							continue;
						}
						for (const row of rows) {
							// Resolve before incrementing: `fired += await …` would read `fired`
							// before the await and write it back after, losing concurrent updates.
							const done = await fireTask(repo, row);
							fired += done;
						}
					}
				});

				// Retention: prune a bounded batch of finished rows on a fixed cadence,
				// racing the live churn above — the shipped retention job's shape.
				const retention = (async () => {
					while (!churnDone && Date.now() - start < TEST_TIMEOUT_MS) {
						await taskRepository.deleteFinishedOlderThan({
							statuses: ['succeeded'],
							olderThanMs: 0,
							limit: CHURN_RETENTION_LIMIT,
						});
						await sleep(CHURN_RETENTION_INTERVAL_MS);
					}
				})();

				// Sampler: high-water marks while churn is in flight. `peakFinishedRows`
				// is the bloat signal — succeeded rows retention hasn't pruned yet.
				const sampler = (async () => {
					while (!churnDone && Date.now() - start < TEST_TIMEOUT_MS) {
						peakLiveRows = Math.max(peakLiveRows, await taskRepository.count());
						peakFinishedRows = Math.max(
							peakFinishedRows,
							await taskRepository.countBy({ status: 'succeeded' }),
						);
						await sleep(CHURN_SAMPLE_INTERVAL_MS);
					}
				})();

				await Promise.all([producer, ...consumers]);
				end = Date.now();
				// Churn has stopped; let retention and the sampler wind down.
				churnDone = true;
				await Promise.all([retention, sampler]);

				// Drain the tail retention hadn't reached when churn stopped, so the
				// end-state assertion reflects "nothing left behind", not timing.
				for (;;) {
					const deleted = await taskRepository.deleteFinishedOlderThan({
						statuses: ['succeeded'],
						olderThanMs: 0,
						limit: 1000,
					});
					if (deleted === 0) break;
				}
			} finally {
				await workers.destroy();
			}

			const elapsedS = (end - start) / 1000;
			const firesPerSec = Math.round(totalFires / elapsedS);
			const finalRows = await taskRepository.count();
			const keptPace = peakFinishedRows <= CHURN_MAX_FINISHED_ROWS;
			const bounded = keptPace && finalRows === 0;

			report('KPI 4 · HEALTH — table stays bounded under concurrent churn', {
				question: 'Does the scheduler table stay bounded (no DB bloat)?',
				[instancesLabel]: CHURN_WORKERS,
				'total fires': commas(totalFires),
				'sustained fires/sec': commas(firesPerSec),
				'peak live rows': commas(peakLiveRows),
				'peak finished-but-unpruned': commas(peakFinishedRows),
				'if retention had lagged': `would have grown to ${commas(totalFires)}`,
				'rows left at end': finalRows,
				VERDICT: bounded
					? `retention kept pace: finished rows peaked at ~${commas(peakFinishedRows)}, not ${commas(totalFires)}`
					: `UNBOUNDED (finished rows peaked at ${commas(peakFinishedRows)} > ${commas(CHURN_MAX_FINISHED_ROWS)} ceiling)`,
			});

			// Correctness: every fire ran exactly once; retention held finished rows
			// bounded under concurrent churn (lower bound guards a vacuous check); the
			// tail fully drained at the end.
			expect(fired).toBe(totalFires);
			expect(peakFinishedRows).toBeGreaterThan(0);
			expect(peakFinishedRows).toBeLessThanOrEqual(CHURN_MAX_FINISHED_ROWS);
			expect(finalRows).toBe(0);
			expect(firesPerSec).toBeGreaterThanOrEqual(CHURN_MIN_FPS);
		},
		TEST_TIMEOUT_MS,
	);
});
