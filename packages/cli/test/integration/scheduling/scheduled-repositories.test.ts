import { testDb } from '@n8n/backend-test-utils';
import type {
	ScheduledJob as ScheduledJobEntity,
	ScheduledTask as ScheduledTaskEntity,
	TerminalTaskStatus,
} from '@n8n/db';
import {
	DbConnectionOptions,
	ScheduledJobRepository,
	ScheduledTask,
	ScheduledTaskRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

// SKIP LOCKED and truly parallel writes only apply on Postgres; the local sqlite driver
// serializes every writer through a single lock. Tests that need real parallelism are
// gated to Postgres (CI/container runs set DB_TYPE=postgresdb).
const isPostgres = process.env.DB_TYPE === 'postgresdb';

// The scheduler's repositories drive the materializer's claim / record / advance steps; these
// exercise them directly against the database, opening transactions via the DataSource.
describe('scheduled repositories', () => {
	let dataSource: DataSource;
	let jobRepository: ScheduledJobRepository;
	let taskRepository: ScheduledTaskRepository;

	// Second DataSource with its own pool, used to hold a concurrent transaction open
	// against the same database. The main DataSource runs with poolSize=1 in CI
	// (set by setup-testcontainers.ts to surface pooling deadlocks), so it can't hand
	// out two connections at once; the disjoint-claim test needs both held open together.
	let secondaryDataSource: DataSource | undefined;

	beforeAll(async () => {
		await testDb.init();
		dataSource = Container.get(DataSource);
		jobRepository = Container.get(ScheduledJobRepository);
		taskRepository = Container.get(ScheduledTaskRepository);

		if (isPostgres) {
			// Full options (not just overrides) so the secondary DataSource registers the same
			// entities and table prefix, letting the repositories build queries on its manager.
			secondaryDataSource = new DataSource(Container.get(DbConnectionOptions).getOptions());
			await secondaryDataSource.initialize();
		}
	});

	beforeEach(async () => {
		await testDb.truncate(['ScheduledTask', 'ScheduledJob']);
	});

	afterAll(async () => {
		if (secondaryDataSource?.isInitialized) {
			await secondaryDataSource.destroy();
		}
		await testDb.terminate();
	});

	// `claimDue` judges due-ness against the database clock, so set nextRunAt relative
	// to now rather than a fixed instant we can't inject.
	const secondsFromNow = (seconds: number) => new Date(Date.now() + seconds * 1000);

	/** Insert a system interval job (null workflowId), return the saved entity. */
	async function createJob(
		overrides: Partial<ScheduledJobEntity> = {},
	): Promise<ScheduledJobEntity> {
		return await jobRepository.save(
			jobRepository.create({
				name: `job-${Math.random().toString(36).slice(2)}`,
				workflowId: null,
				nodeId: null,
				taskType: 'scheduleTrigger',
				payload: {},
				kind: 'interval',
				intervalSeconds: 60,
				enabled: true,
				nextRunAt: secondsFromNow(-60),
				maxAttempts: 1,
				...overrides,
			}),
		);
	}

	/** Insert a task in a given lifecycle state; `scheduledFor` is made unique per row. */
	let taskSequence = 0;
	async function createTask(
		jobId: number,
		overrides: Partial<ScheduledTaskEntity> = {},
	): Promise<ScheduledTaskEntity> {
		const scheduledFor = secondsFromNow(-++taskSequence);
		return await taskRepository.save(
			taskRepository.create({
				jobId,
				taskType: 'scheduleTrigger',
				payload: {},
				scheduledFor,
				runAt: scheduledFor,
				maxAttempts: 1,
				...overrides,
			}),
		);
	}

	describe('transaction', () => {
		it('commits repository calls made through the transaction manager', async () => {
			const job = await createJob({ nextRunAt: secondsFromNow(-60) });
			const nextRunAt = secondsFromNow(3600);
			const scheduledFor = secondsFromNow(-60);

			await dataSource.transaction(async (trx) => {
				await jobRepository.advanceMany(trx, [
					{ id: job.id, nextRunAt, lastFiredAt: scheduledFor },
				]);
				await taskRepository.insertIgnoringDuplicates(trx, [
					{
						jobId: job.id,
						taskType: 'scheduleTrigger',
						payload: {},
						scheduledFor,
						runAt: scheduledFor,
						maxAttempts: 1,
					},
				]);
			});

			const reloaded = await jobRepository.findOneByOrFail({ id: job.id });
			expect(reloaded.nextRunAt!.getTime()).toBe(nextRunAt.getTime());
			expect(await taskRepository.findBy({ jobId: job.id })).toHaveLength(1);
		});

		it('rolls back all writes when the callback throws', async () => {
			const nextRunAt = secondsFromNow(-60);
			const job = await createJob({ nextRunAt });
			const scheduledFor = secondsFromNow(-60);

			await expect(
				dataSource.transaction(async (trx) => {
					await taskRepository.insertIgnoringDuplicates(trx, [
						{
							jobId: job.id,
							taskType: 'scheduleTrigger',
							payload: {},
							scheduledFor,
							runAt: scheduledFor,
							maxAttempts: 1,
						},
					]);
					await jobRepository.advanceMany(trx, [
						{ id: job.id, nextRunAt: secondsFromNow(3600), lastFiredAt: scheduledFor },
					]);
					throw new Error('boom');
				}),
			).rejects.toThrow('boom');

			// Neither the occurrence nor the schedule advance survived.
			expect(await taskRepository.findBy({ jobId: job.id })).toHaveLength(0);
			const reloaded = await jobRepository.findOneByOrFail({ id: job.id });
			expect(reloaded.nextRunAt!.getTime()).toBe(nextRunAt.getTime());
			expect(reloaded.lastFiredAt).toBeNull();
		});

		it('rejects insertIgnoringDuplicates when called outside a transaction', async () => {
			const job = await createJob();
			const scheduledFor = secondsFromNow(-60);

			// The plain DataSource manager has no queryRunner, which is how the guard
			// detects a call made outside `dataSource.transaction`.
			await expect(
				taskRepository.insertIgnoringDuplicates(dataSource.manager, [
					{
						jobId: job.id,
						taskType: 'scheduleTrigger',
						payload: {},
						scheduledFor,
						runAt: scheduledFor,
						maxAttempts: 1,
					},
				]),
			).rejects.toThrow('insertIgnoringDuplicates must run within a transaction');

			expect(await taskRepository.findBy({ jobId: job.id })).toHaveLength(0);
		});
	});

	describe('ScheduledJobRepository.claimDue', () => {
		it('returns due jobs ordered by nextRunAt, capped at limit', async () => {
			// Insert out of nextRunAt order so the result proves ORDER BY, not insertion order.
			const dueLate = await createJob({ nextRunAt: secondsFromNow(-60) });
			const dueEarly = await createJob({ nextRunAt: secondsFromNow(-120) });
			await createJob({ nextRunAt: secondsFromNow(-30) }); // due, but past the limit

			const claimed = await dataSource.transaction(
				async (trx) => await jobRepository.claimDue(trx, 2),
			);

			expect(claimed?.jobs.map((j) => j.id)).toEqual([dueEarly.id, dueLate.id]);
		});

		it('excludes disabled, future, and null-nextRunAt jobs', async () => {
			await createJob({ enabled: false, nextRunAt: secondsFromNow(-60) });
			await createJob({ nextRunAt: secondsFromNow(3600) });
			await createJob({ nextRunAt: null });

			const claimed = await dataSource.transaction(
				async (trx) => await jobRepository.claimDue(trx, 100),
			);

			expect(claimed).toBeUndefined();
		});

		it('persists and reads back each schedule kind from its columns', async () => {
			const dueAt = secondsFromNow(-60);
			const fireAt = secondsFromNow(-120);
			const cron = await createJob({
				kind: 'cron',
				cronExpression: '0 0 9 * * *',
				timezone: 'Europe/Berlin',
				intervalSeconds: null,
				nextRunAt: dueAt,
			});
			const interval = await createJob({ kind: 'interval', intervalSeconds: 30, nextRunAt: dueAt });
			const oneOff = await createJob({
				kind: 'one_off',
				intervalSeconds: null,
				fireAt,
				nextRunAt: dueAt,
			});

			const claimed = await dataSource.transaction(
				async (trx) => await jobRepository.claimDue(trx, 100),
			);
			expect(claimed).toBeDefined();
			const byId = new Map(claimed!.jobs.map((j) => [j.id, j]));

			expect(byId.get(cron.id)).toMatchObject({
				kind: 'cron',
				cronExpression: '0 0 9 * * *',
				timezone: 'Europe/Berlin',
			});
			expect(byId.get(interval.id)).toMatchObject({ kind: 'interval', intervalSeconds: 30 });
			expect(byId.get(oneOff.id)).toMatchObject({ kind: 'one_off', fireAt });
		});

		// Postgres only: with two transactions open at once, FOR UPDATE SKIP LOCKED must hand
		// each claimer a different job instead of letting both grab the same one. On sqlite
		// this can't be exercised: the single-writer lock won't let two write transactions
		// run at the same time.
		it.skipIf(!isPostgres)(
			'hands disjoint jobs to two claimers with transactions open at once',
			async () => {
				const older = await createJob({ nextRunAt: secondsFromNow(-120) });
				const newer = await createJob({ nextRunAt: secondsFromNow(-60) });

				// runnerB draws from the secondary pool so both transactions can be held open at
				// once; the main pool is capped at a single connection in CI.
				const runnerA = dataSource.createQueryRunner();
				const runnerB = secondaryDataSource!.createQueryRunner();
				try {
					await runnerA.connect();
					await runnerB.connect();
					await runnerA.startTransaction();
					await runnerB.startTransaction();

					// A claims first and holds its row locked; B, running while A is still open,
					// must skip A's row and take the other.
					const claimedA = await jobRepository.claimDue(runnerA.manager, 1);
					const claimedB = await jobRepository.claimDue(runnerB.manager, 1);

					await runnerA.commitTransaction();
					await runnerB.commitTransaction();

					const idsA = claimedA?.jobs.map((j) => j.id) ?? [];
					const idsB = claimedB?.jobs.map((j) => j.id) ?? [];

					expect(idsA).toEqual([older.id]);
					expect(idsB).toEqual([newer.id]);
					expect(idsA.filter((id) => idsB.includes(id))).toHaveLength(0);
				} finally {
					await runnerA.release();
					await runnerB.release();
				}
			},
		);
	});

	describe('ScheduledJobRepository.advanceMany', () => {
		it('persists nextRunAt and lastFiredAt', async () => {
			const job = await createJob({ nextRunAt: secondsFromNow(-60) });
			const nextRunAt = secondsFromNow(3600);
			const lastFiredAt = secondsFromNow(-60);

			await dataSource.transaction(
				async (trx) =>
					await jobRepository.advanceMany(trx, [{ id: job.id, nextRunAt, lastFiredAt }]),
			);

			const reloaded = await jobRepository.findOneByOrFail({ id: job.id });
			expect(reloaded.nextRunAt!.getTime()).toBe(nextRunAt.getTime());
			expect(reloaded.lastFiredAt!.getTime()).toBe(lastFiredAt.getTime());
		});

		it('clears nextRunAt so the job drops out of the due read', async () => {
			const job = await createJob({ nextRunAt: secondsFromNow(-60) });

			await dataSource.transaction(
				async (trx) =>
					await jobRepository.advanceMany(trx, [
						{ id: job.id, nextRunAt: null, lastFiredAt: secondsFromNow(-60) },
					]),
			);

			const reloaded = await jobRepository.findOneByOrFail({ id: job.id });
			expect(reloaded.nextRunAt).toBeNull();

			const claimed = await dataSource.transaction(
				async (trx) => await jobRepository.claimDue(trx, 100),
			);
			expect(claimed).toBeUndefined();
		});

		it('advances a batch larger than the chunk size across multiple statements', async () => {
			const jobs = await Promise.all(
				Array.from({ length: 5 }, async () => await createJob({ nextRunAt: secondsFromNow(-60) })),
			);
			const nextRunAt = secondsFromNow(3600);
			const advances = jobs.map((job) => ({
				id: job.id,
				nextRunAt,
				lastFiredAt: null,
			}));

			// 5 advances at 2/chunk forces three statements, exercising the loop.
			await dataSource.transaction(
				async (trx) => await jobRepository.advanceMany(trx, advances, 2),
			);

			for (const job of jobs) {
				const reloaded = await jobRepository.findOneByOrFail({ id: job.id });
				expect(reloaded.nextRunAt!.getTime()).toBe(nextRunAt.getTime());
			}
		});
	});

	describe('ScheduledTaskRepository.insertIgnoringDuplicates', () => {
		it('inserts occurrences and returns how many were recorded', async () => {
			const job = await createJob();
			const scheduledFor = secondsFromNow(-60);

			const result = await dataSource.transaction(
				async (trx) =>
					await taskRepository.insertIgnoringDuplicates(trx, [
						{
							jobId: job.id,
							taskType: 'scheduleTrigger',
							payload: { foo: 'bar' },
							scheduledFor,
							runAt: scheduledFor,
							maxAttempts: 1,
						},
					]),
			);

			expect(result.recorded).toBe(1);
			const stored = await taskRepository.findBy({ jobId: job.id });
			expect(stored).toHaveLength(1);
			expect(stored[0].scheduledFor.getTime()).toBe(scheduledFor.getTime());
		});

		// Postgres only: SQLite's driver never surfaces RETURNING rows from a raw
		// insert, so row identity for tracing is a Postgres-only capability.
		it.skipIf(!isPostgres)('returns the identity of each newly created row', async () => {
			const job = await createJob();
			const scheduledFor = secondsFromNow(-60);

			const result = await dataSource.transaction(
				async (trx) =>
					await taskRepository.insertIgnoringDuplicates(trx, [
						{
							jobId: job.id,
							taskType: 'scheduleTrigger',
							payload: {},
							scheduledFor,
							runAt: scheduledFor,
							maxAttempts: 1,
						},
					]),
			);

			expect(result.created).toHaveLength(1);
			const stored = await taskRepository.findOneByOrFail({ jobId: job.id });
			expect(result.created[0]).toEqual({
				id: stored.id,
				jobId: job.id,
				taskType: 'scheduleTrigger',
			});
		});

		it('is idempotent on (jobId, scheduledFor): a duplicate is skipped and not counted', async () => {
			const job = await createJob();
			const scheduledFor = secondsFromNow(-60);
			const occurrence = {
				jobId: job.id,
				taskType: 'scheduleTrigger',
				payload: {},
				scheduledFor,
				runAt: scheduledFor,
				maxAttempts: 1,
			};

			const first = await dataSource.transaction(
				async (trx) => await taskRepository.insertIgnoringDuplicates(trx, [occurrence]),
			);
			const second = await dataSource.transaction(
				async (trx) => await taskRepository.insertIgnoringDuplicates(trx, [occurrence]),
			);

			expect(first.recorded).toBe(1);
			expect(second.recorded).toBe(0);
			expect(await taskRepository.findBy({ jobId: job.id })).toHaveLength(1);
		});

		it('inserts a batch larger than the chunk size across multiple statements', async () => {
			const job = await createJob();
			const base = secondsFromNow(-5000);
			// 2500 rows forces three chunks at the default 1000/chunk, exercising the loop.
			const occurrences = Array.from({ length: 2500 }, (_, i) => {
				const when = new Date(base.getTime() + i * 1000);
				return {
					jobId: job.id,
					taskType: 'scheduleTrigger',
					payload: {},
					scheduledFor: when,
					runAt: when,
					maxAttempts: 1,
				};
			});

			const result = await dataSource.transaction(
				async (trx) => await taskRepository.insertIgnoringDuplicates(trx, occurrences),
			);

			expect(result.recorded).toBe(2500);
			expect(await taskRepository.countBy({ jobId: job.id })).toBe(2500);
		});

		// Postgres only: two transactions inserting the same (jobId, scheduledFor) at once.
		// The unique index lets exactly one win; the other's ON CONFLICT DO NOTHING records 0.
		it.skipIf(!isPostgres)(
			'records a single row when two transactions insert the same occurrence at once',
			async () => {
				const job = await createJob();
				const scheduledFor = secondsFromNow(-60);
				const occurrence = {
					jobId: job.id,
					taskType: 'scheduleTrigger',
					payload: {},
					scheduledFor,
					runAt: scheduledFor,
					maxAttempts: 1,
				};

				const [first, second] = await Promise.all([
					dataSource.transaction(
						async (trx) => await taskRepository.insertIgnoringDuplicates(trx, [occurrence]),
					),
					dataSource.transaction(
						async (trx) => await taskRepository.insertIgnoringDuplicates(trx, [occurrence]),
					),
				]);

				expect(first.recorded + second.recorded).toBe(1);
				expect(await taskRepository.findBy({ jobId: job.id })).toHaveLength(1);
			},
		);
	});

	describe('ScheduledTaskRepository.deleteFinishedOlderThan', () => {
		const HOUR_MS = 60 * 60 * 1000;

		it('deletes only rows in the given statuses finished before the cutoff', async () => {
			const job = await createJob();
			await createTask(job.id, { status: 'succeeded', finishedAt: secondsFromNow(-7200) });
			await createTask(job.id, { status: 'cancelled', finishedAt: secondsFromNow(-7200) });
			const freshSucceeded = await createTask(job.id, {
				status: 'succeeded',
				finishedAt: secondsFromNow(-60),
			});
			const oldFailed = await createTask(job.id, {
				status: 'failed',
				finishedAt: secondsFromNow(-7200),
			});
			const pending = await createTask(job.id, { status: 'pending' });
			const running = await createTask(job.id, {
				status: 'running',
				claimedBy: 'main-1',
				leaseExpiresAt: secondsFromNow(-7200),
			});

			const deleted = await taskRepository.deleteFinishedOlderThan({
				statuses: ['succeeded', 'cancelled'],
				olderThanMs: HOUR_MS,
				limit: 100,
			});

			// Both expired clean rows went; the fresh one, other statuses, and
			// live rows (no finishedAt) survived.
			expect(deleted).toBe(2);
			const survivors = new Set((await taskRepository.find()).map((t) => t.id));
			expect(survivors).toEqual(new Set([freshSucceeded.id, oldFailed.id, pending.id, running.id]));
		});

		it('deletes the oldest rows first when the limit caps a batch', async () => {
			const job = await createJob();
			await createTask(job.id, { status: 'succeeded', finishedAt: secondsFromNow(-4 * 3600) });
			await createTask(job.id, { status: 'succeeded', finishedAt: secondsFromNow(-3 * 3600) });
			const youngest = await createTask(job.id, {
				status: 'succeeded',
				finishedAt: secondsFromNow(-2 * 3600),
			});

			const deleted = await taskRepository.deleteFinishedOlderThan({
				statuses: ['succeeded'],
				olderThanMs: HOUR_MS,
				limit: 2,
			});

			expect(deleted).toBe(2);
			const remaining = await taskRepository.find();
			expect(remaining.map((t) => t.id)).toEqual([youngest.id]);
		});

		it('never deletes a terminal row missing finishedAt', async () => {
			const job = await createJob();
			// Transitions always set finishedAt; a row without it has no provable
			// age, so retention must leave it alone rather than guess.
			const untimed = await createTask(job.id, { status: 'succeeded', finishedAt: null });

			const deleted = await taskRepository.deleteFinishedOlderThan({
				statuses: ['succeeded'],
				olderThanMs: 0,
				limit: 100,
			});

			expect(deleted).toBe(0);
			expect((await taskRepository.find()).map((t) => t.id)).toEqual([untimed.id]);
		});

		it('deletes nothing when no statuses are given', async () => {
			const job = await createJob();
			await createTask(job.id, { status: 'succeeded', finishedAt: secondsFromNow(-7200) });

			const deleted = await taskRepository.deleteFinishedOlderThan({
				statuses: [],
				olderThanMs: HOUR_MS,
				limit: 100,
			});

			expect(deleted).toBe(0);
			expect(await taskRepository.count()).toBe(1);
		});

		it('rejects live statuses before touching any row', async () => {
			const job = await createJob();
			const oldPending = await createTask(job.id, { status: 'pending' });

			// The type already forbids this; the cast simulates a value smuggled
			// past it (an untyped caller), which the runtime guard must stop.
			await expect(
				taskRepository.deleteFinishedOlderThan({
					statuses: ['pending' as TerminalTaskStatus, 'succeeded'],
					olderThanMs: 0,
					limit: 100,
				}),
			).rejects.toThrow('only deletes terminal tasks, got: pending');
			expect((await taskRepository.find()).map((t) => t.id)).toEqual([oldPending.id]);
		});

		it('rejects a non-integer limit before touching any row', async () => {
			const job = await createJob();
			await createTask(job.id, { status: 'succeeded', finishedAt: secondsFromNow(-7200) });

			await expect(
				taskRepository.deleteFinishedOlderThan({
					statuses: ['succeeded'],
					olderThanMs: HOUR_MS,
					limit: 1.5,
				}),
			).rejects.toThrow('needs an integer limit, got: 1.5');
			expect(await taskRepository.count()).toBe(1);
		});

		it('treats a non-positive limit as a no-op batch', async () => {
			const job = await createJob();
			await createTask(job.id, { status: 'succeeded', finishedAt: secondsFromNow(-7200) });

			const deleted = await taskRepository.deleteFinishedOlderThan({
				statuses: ['succeeded'],
				olderThanMs: HOUR_MS,
				limit: 0,
			});

			expect(deleted).toBe(0);
			expect(await taskRepository.count()).toBe(1);
		});

		// Postgres only: while another transaction holds eligible rows locked,
		// FOR UPDATE SKIP LOCKED must hand the concurrent batch the remaining rows
		// instead of blocking on (or double-deleting) the locked ones. On sqlite
		// the single-writer lock serializes the two, so there is nothing to skip.
		it.skipIf(!isPostgres)(
			'skips rows another transaction holds locked and deletes the rest',
			async () => {
				const job = await createJob();
				const lockedOlder = await createTask(job.id, {
					status: 'succeeded',
					finishedAt: secondsFromNow(-4 * 3600),
				});
				const lockedNewer = await createTask(job.id, {
					status: 'succeeded',
					finishedAt: secondsFromNow(-3 * 3600),
				});
				await createTask(job.id, {
					status: 'succeeded',
					finishedAt: secondsFromNow(-2 * 3600),
				});

				// The holder draws from the secondary pool so its transaction stays
				// open while the delete runs on the main pool.
				const runner = secondaryDataSource!.createQueryRunner();
				try {
					await runner.connect();
					await runner.startTransaction();
					await runner.manager
						.getRepository(ScheduledTask)
						.createQueryBuilder('task')
						.setLock('pessimistic_write')
						.whereInIds([lockedOlder.id, lockedNewer.id])
						.getMany();

					const deleted = await taskRepository.deleteFinishedOlderThan({
						statuses: ['succeeded'],
						olderThanMs: HOUR_MS,
						limit: 10,
					});

					// Only the unlocked row went, even though the locked ones are older.
					expect(deleted).toBe(1);
					const survivors = new Set((await taskRepository.find()).map((t) => t.id));
					expect(survivors).toEqual(new Set([lockedOlder.id, lockedNewer.id]));

					await runner.rollbackTransaction();
				} finally {
					await runner.release();
				}

				// With the lock released, the next batch reaps what was skipped.
				const rest = await taskRepository.deleteFinishedOlderThan({
					statuses: ['succeeded'],
					olderThanMs: HOUR_MS,
					limit: 10,
				});
				expect(rest).toBe(2);
				expect(await taskRepository.count()).toBe(0);
			},
		);
	});

	describe('ScheduledTaskRepository.getMetricSnapshot', () => {
		it('reports queue depth counts and the oldest due pending age', async () => {
			const job = await createJob();
			const now = new Date();

			// Two due pending rows (runAt in the past) and one not-yet-due pending row.
			const dueOld = await createTask(job.id, {
				status: 'pending',
				runAt: new Date(now.getTime() - 120_000),
			});
			await createTask(job.id, { status: 'pending', runAt: new Date(now.getTime() - 30_000) });
			await createTask(job.id, { status: 'pending', runAt: new Date(now.getTime() + 3_600_000) });
			// A running row, plus terminal rows that must not be counted.
			await createTask(job.id, {
				status: 'running',
				claimedBy: 'main-1',
				leaseExpiresAt: new Date(now.getTime() + 60_000),
			});
			await createTask(job.id, { status: 'succeeded', finishedAt: secondsFromNow(-60) });
			await createTask(job.id, { status: 'failed', finishedAt: secondsFromNow(-60) });

			const snapshot = await taskRepository.getMetricSnapshot();

			expect(snapshot.pending).toBe(3); // both due rows plus the future one
			expect(snapshot.due).toBe(2); // only the two past-runAt rows are actionable
			expect(snapshot.running).toBe(1);
			// Lag tracks the oldest DUE pending row, not the future one. Measured against
			// DB-now, so it's at least the row's age at seed time, plus the small elapsed
			// time until the query ran.
			const seededAgeMs = now.getTime() - dueOld.runAt.getTime();
			expect(snapshot.oldestPendingAgeMs).toBeGreaterThanOrEqual(seededAgeMs);
			expect(snapshot.oldestPendingAgeMs).toBeLessThan(seededAgeMs + 60_000);
		});

		it('returns a null oldest age when no pending row is due', async () => {
			const job = await createJob();
			const now = new Date();

			await createTask(job.id, { status: 'pending', runAt: new Date(now.getTime() + 3_600_000) });
			await createTask(job.id, {
				status: 'running',
				claimedBy: 'main-1',
				leaseExpiresAt: new Date(now.getTime() + 60_000),
			});

			const snapshot = await taskRepository.getMetricSnapshot();

			expect(snapshot.pending).toBe(1);
			expect(snapshot.due).toBe(0);
			expect(snapshot.running).toBe(1);
			expect(snapshot.oldestPendingAgeMs).toBeNull();
		});

		it('reports all-zero counts and a null age on an empty queue', async () => {
			const snapshot = await taskRepository.getMetricSnapshot();

			expect(snapshot).toEqual({ pending: 0, due: 0, running: 0, oldestPendingAgeMs: null });
		});
	});
});
