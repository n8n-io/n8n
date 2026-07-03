import { testDb } from '@n8n/backend-test-utils';
import type { ScheduledJob as ScheduledJobEntity } from '@n8n/db';
import { DbConnectionOptions, ScheduledJobRepository, ScheduledTaskRepository } from '@n8n/db';
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

			const recorded = await dataSource.transaction(
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

			expect(recorded).toBe(1);
			const stored = await taskRepository.findBy({ jobId: job.id });
			expect(stored).toHaveLength(1);
			expect(stored[0].scheduledFor.getTime()).toBe(scheduledFor.getTime());
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

			expect(first).toBe(1);
			expect(second).toBe(0);
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

			const recorded = await dataSource.transaction(
				async (trx) => await taskRepository.insertIgnoringDuplicates(trx, occurrences),
			);

			expect(recorded).toBe(2500);
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

				expect(first + second).toBe(1);
				expect(await taskRepository.findBy({ jobId: job.id })).toHaveLength(1);
			},
		);
	});
});
