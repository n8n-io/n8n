import { testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { ScheduledJob as ScheduledJobEntity, ScheduledTask } from '@n8n/db';
import { DataSource, ScheduledJobRepository, ScheduledTaskRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { selfOwned } from './shared/job-factory';

/**
 * Real-DB coverage for the claim/lease/terminal behaviour the executor relies on,
 * across cli's sqlite + postgres matrix (the dialect-split locking is the point).
 * Due-ness uses the DB clock, so tasks are made due with a `runAt` in the past.
 */
describe('ScheduledTaskRepository executor methods', () => {
	const isPostgres = process.env.DB_TYPE === 'postgresdb';
	const TASK_TYPE = 'scheduleTrigger';
	const HOST_A = 'main-a';
	const HOST_B = 'main-b';
	// Comfortably-past instant, computed per call (not at module load) so a slow suite
	// can't drift it towards now().
	const past = () => new Date(Date.now() - 60_000);

	let dataSource: DataSource;
	let jobRepository: ScheduledJobRepository;
	let taskRepository: ScheduledTaskRepository;
	let job: ScheduledJobEntity;
	// Monotonic so each created task gets a distinct scheduledFor (the occurrence
	// identity is unique on (jobId, scheduledFor)); runAt drives due-ness separately.
	let scheduledForSeq = 0;

	const claimOpts = (
		overrides: Partial<Parameters<ScheduledTaskRepository['claimDueTasks']>[0]> = {},
	) => ({
		host: HOST_A,
		taskTypes: [TASK_TYPE],
		lookaheadMs: 0,
		leaseMs: 60_000,
		batchSize: 10,
		...overrides,
	});

	async function createTask(overrides: Partial<ScheduledTask> = {}): Promise<ScheduledTask> {
		scheduledForSeq += 1;
		return await taskRepository.save(
			taskRepository.create({
				jobId: job.id,
				taskType: TASK_TYPE,
				payload: {},
				scheduledFor: new Date(Date.parse('2026-06-01T00:00:00.000Z') + scheduledForSeq * 1000),
				runAt: past(),
				status: 'pending',
				attempts: 0,
				maxAttempts: 1,
				...overrides,
			}),
		);
	}

	const reload = async (id: string) => await taskRepository.findOneByOrFail({ id });

	beforeAll(async () => {
		// Use separate connections for concurrent claims.
		Container.get(GlobalConfig).database.postgresdb.poolSize = 4;
		await testDb.init();
		dataSource = Container.get(DataSource);
		jobRepository = Container.get(ScheduledJobRepository);
		taskRepository = Container.get(ScheduledTaskRepository);
	});

	beforeEach(async () => {
		await testDb.truncate(['ScheduledTask', 'ScheduledJob']);
		const jobName = `job-${Math.random().toString(36).slice(2)}`;
		job = await jobRepository.save(
			jobRepository.create({
				name: jobName,
				...selfOwned(jobName),
				taskType: TASK_TYPE,
				payload: {},
				kind: 'interval',
				intervalSeconds: 60,
				enabled: true,
				nextRunAt: new Date('2026-01-01T00:00:00.000Z'),
				maxAttempts: 1,
			}),
		);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('claimDueTasks', () => {
		it('claims a due task: pending -> running, sets owner + lease, bumps epoch', async () => {
			const task = await createTask();

			const claimed = await taskRepository.claimDueTasks(claimOpts());

			expect(claimed).toHaveLength(1);
			expect(claimed[0].id).toBe(task.id);
			expect(claimed[0].status).toBe('running');
			expect(claimed[0].claimedBy).toBe(HOST_A);
			expect(claimed[0].leaseEpoch).toBe(1);
			// A live lease must be in the future, not merely set.
			expect(claimed[0].leaseExpiresAt?.getTime()).toBeGreaterThan(Date.now());

			const row = await reload(task.id);
			expect(row.status).toBe('running');
			expect(row.claimedBy).toBe(HOST_A);
			expect(row.leaseExpiresAt!.getTime()).toBeGreaterThan(Date.now());
		});

		it('claims nothing when taskTypes is empty', async () => {
			await createTask();
			expect(await taskRepository.claimDueTasks(claimOpts({ taskTypes: [] }))).toHaveLength(0);
		});

		it('claims only the registered task types', async () => {
			await createTask({ taskType: 'other' });
			const wanted = await createTask({ taskType: TASK_TYPE });

			const claimed = await taskRepository.claimDueTasks(claimOpts({ taskTypes: [TASK_TYPE] }));

			expect(claimed.map((t) => t.id)).toEqual([wanted.id]);
		});

		it('does not claim a task that is not yet due (beyond the lookahead)', async () => {
			await createTask({ runAt: new Date(Date.now() + 60_000) });
			expect(await taskRepository.claimDueTasks(claimOpts({ lookaheadMs: 0 }))).toHaveLength(0);
		});

		it('claims a not-yet-due task once it falls within the lookahead', async () => {
			const soon = await createTask({ runAt: new Date(Date.now() + 10_000) });
			const claimed = await taskRepository.claimDueTasks(claimOpts({ lookaheadMs: 30_000 }));
			expect(claimed.map((t) => t.id)).toEqual([soon.id]);
		});

		it('does not claim an occurrence past its deadline', async () => {
			const stale = await createTask({
				runAt: past(),
				missedAfter: new Date(Date.now() - 30_000),
			});

			const claimed = await taskRepository.claimDueTasks(claimOpts());

			expect(claimed.map((t) => t.id)).not.toContain(stale.id);
			expect((await reload(stale.id)).status).toBe('pending');
		});

		it('claims an occurrence still inside its deadline', async () => {
			const late = await createTask({
				runAt: past(),
				missedAfter: new Date(Date.now() + 30_000),
			});

			const claimed = await taskRepository.claimDueTasks(claimOpts());

			expect(claimed.map((t) => t.id)).toContain(late.id);
		});

		it('claims an occurrence that carries no deadline', async () => {
			const legacy = await createTask({ runAt: past(), missedAfter: null });

			const claimed = await taskRepository.claimDueTasks(claimOpts());

			expect(claimed.map((t) => t.id)).toContain(legacy.id);
		});

		it('still claims a retry whose deadline passed while it waited out its backoff', async () => {
			const retry = await createTask({
				runAt: past(),
				missedAfter: new Date(Date.now() - 30_000),
				attempts: 1,
				maxAttempts: 3,
			});

			const claimed = await taskRepository.claimDueTasks(claimOpts());

			expect(claimed.map((t) => t.id)).toContain(retry.id);
		});

		it('caps the claim at batchSize, taking the earliest by runAt', async () => {
			// Insert in a different order than runAt so the test isolates ORDER BY runAt
			// from insertion/id order: a "pick earliest by id" bug would fail here.
			const late = await createTask({ runAt: new Date(Date.now() - 10_000) });
			const earliest = await createTask({ runAt: new Date(Date.now() - 30_000) });
			const middle = await createTask({ runAt: new Date(Date.now() - 20_000) });

			const claimed = await taskRepository.claimDueTasks(claimOpts({ batchSize: 2 }));

			// The two earliest-runAt rows are chosen; RETURNING order is unspecified
			// (the executor schedules each task by its own runAt), so compare as a set.
			const claimedIds = claimed.map((t) => t.id);
			expect(claimedIds).toHaveLength(2);
			expect(claimedIds).toEqual(expect.arrayContaining([earliest.id, middle.id]));
			expect(claimedIds).not.toContain(late.id);
		});

		it('claims a task whose runAt is exactly now (inclusive boundary)', async () => {
			// runAt == now with a small lookahead: runAt <= now()+lookahead must hold.
			const task = await createTask({ runAt: new Date() });
			const claimed = await taskRepository.claimDueTasks(claimOpts({ lookaheadMs: 1_000 }));
			expect(claimed.map((t) => t.id)).toContain(task.id);
		});

		it('never lets two concurrent claimers take the same row', async () => {
			// On sqlite the BEGIN IMMEDIATE write lock serialises the two claimers; on
			// Postgres FOR UPDATE SKIP LOCKED keeps them disjoint. Either way: every row is
			// claimed exactly once and the persisted owner matches the claimer that got it.
			const created = await Promise.all([
				createTask(),
				createTask(),
				createTask(),
				createTask(),
				createTask(),
			]);

			const [a, b] = await Promise.all([
				taskRepository.claimDueTasks(claimOpts({ host: HOST_A })),
				taskRepository.claimDueTasks(claimOpts({ host: HOST_B })),
			]);

			const ids = [...a, ...b].map((t) => t.id);
			expect(new Set(ids).size).toBe(ids.length); // no row claimed twice
			expect(new Set(ids)).toEqual(new Set(created.map((t) => t.id))); // none dropped

			// The DB owner matches whichever claimer returned the row (not just the
			// in-memory object, which trivially carries opts.host).
			for (const claimer of [
				{ host: HOST_A, rows: a },
				{ host: HOST_B, rows: b },
			]) {
				for (const t of claimer.rows) {
					expect((await reload(t.id)).claimedBy).toBe(claimer.host);
				}
			}
		});

		it('a second claim of an already-running row is a no-op', async () => {
			await createTask();
			const first = await taskRepository.claimDueTasks(claimOpts({ host: HOST_A }));
			expect(first).toHaveLength(1);

			const second = await taskRepository.claimDueTasks(claimOpts({ host: HOST_B }));
			expect(second).toHaveLength(0);
		});
	});

	describe('claimDueTasks under a concurrencyLimit', () => {
		const createLimitedJob = async (concurrencyLimit: number | null) => {
			const jobName = `limited-${Math.random().toString(36).slice(2)}`;
			return await jobRepository.save(
				jobRepository.create({
					name: jobName,
					...selfOwned(jobName),
					taskType: TASK_TYPE,
					payload: {},
					kind: 'interval',
					intervalSeconds: 60,
					enabled: true,
					nextRunAt: new Date('2026-01-01T00:00:00.000Z'),
					maxAttempts: 1,
					concurrencyLimit,
				}),
			);
		};

		const statusOf = async (id: string) => (await reload(id)).status;

		const runningCountOf = async (jobId: number) =>
			await taskRepository.countBy({ jobId, status: 'running' });

		it('claims one of two due occurrences of a limit-1 job and keeps the other pending', async () => {
			const limited = await createLimitedJob(1);
			const first = await createTask({ jobId: limited.id, runAt: new Date(Date.now() - 30_000) });
			const second = await createTask({ jobId: limited.id, runAt: new Date(Date.now() - 20_000) });

			const claimed = await taskRepository.claimDueTasks(claimOpts());

			expect(claimed.map((t) => t.id)).toEqual([first.id]);
			expect(await statusOf(second.id)).toBe('pending');
			expect((await reload(second.id)).claimedBy).toBeNull();
			expect(await runningCountOf(limited.id)).toBe(1);
		});

		it('counts an occurrence already running elsewhere against the limit, even past its deadline', async () => {
			const limited = await createLimitedJob(1);
			await createTask({
				jobId: limited.id,
				status: 'running',
				claimedBy: HOST_B,
				leaseExpiresAt: new Date(Date.now() + 60_000),
				leaseEpoch: 1,
				missedAfter: new Date(Date.now() - 60_000),
			});
			const due = await createTask({ jobId: limited.id });

			const claimed = await taskRepository.claimDueTasks(claimOpts());

			expect(claimed).toHaveLength(0);
			expect(await statusOf(due.id)).toBe('pending');
			expect(await runningCountOf(limited.id)).toBe(1);
		});

		it('never has two running occurrences of a limit-1 job across passes', async () => {
			const limited = await createLimitedJob(1);
			await createTask({ jobId: limited.id });
			await createTask({ jobId: limited.id });

			const first = await taskRepository.claimDueTasks(claimOpts());
			const second = await taskRepository.claimDueTasks(claimOpts({ host: HOST_B }));

			expect(first).toHaveLength(1);
			expect(second).toHaveLength(0);
			expect(await runningCountOf(limited.id)).toBe(1);
		});

		it('runs two of three due occurrences of a limit-2 job and keeps the third pending', async () => {
			const limited = await createLimitedJob(2);
			const a = await createTask({ jobId: limited.id, runAt: new Date(Date.now() - 30_000) });
			const b = await createTask({ jobId: limited.id, runAt: new Date(Date.now() - 20_000) });
			const c = await createTask({ jobId: limited.id, runAt: new Date(Date.now() - 10_000) });

			const claimed = await taskRepository.claimDueTasks(claimOpts());

			expect(new Set(claimed.map((t) => t.id))).toEqual(new Set([a.id, b.id]));
			expect(await statusOf(c.id)).toBe('pending');
			expect(await runningCountOf(limited.id)).toBe(2);
		});

		it('claims a held occurrence once a slot frees up, while its deadline is ahead', async () => {
			const limited = await createLimitedJob(1);
			await createTask({ jobId: limited.id, runAt: new Date(Date.now() - 30_000) });
			const held = await createTask({
				jobId: limited.id,
				runAt: new Date(Date.now() - 20_000),
				missedAfter: new Date(Date.now() + 60_000),
			});

			const [running] = await taskRepository.claimDueTasks(claimOpts());
			expect(await taskRepository.claimDueTasks(claimOpts())).toHaveLength(0);

			await taskRepository.completeTask({
				host: HOST_A,
				id: running.id,
				claimedEpoch: running.leaseEpoch,
			});

			const claimed = await taskRepository.claimDueTasks(claimOpts());

			expect(claimed.map((t) => t.id)).toEqual([held.id]);
			expect(await runningCountOf(limited.id)).toBe(1);
		});

		it('retires a held occurrence as missed once its deadline passes, without running it', async () => {
			const limited = await createLimitedJob(1);
			await createTask({ jobId: limited.id, runAt: new Date(Date.now() - 30_000) });
			const held = await createTask({
				jobId: limited.id,
				runAt: new Date(Date.now() - 20_000),
				missedAfter: new Date(Date.now() + 60_000),
			});

			expect(await taskRepository.claimDueTasks(claimOpts())).toHaveLength(1);
			expect(await statusOf(held.id)).toBe('pending');

			await taskRepository.update(held.id, { missedAfter: new Date(Date.now() - 1_000) });

			expect(await taskRepository.claimDueTasks(claimOpts())).toHaveLength(0);
			expect(await taskRepository.retireMissedPending(10)).toBe(1);

			const retired = await reload(held.id);
			expect(retired.status).toBe('missed');
			expect(retired.claimedBy).toBeNull();
			expect(retired.startedAt).toBeNull();
		});

		it('claims the next occurrence without waiting for an expired one to retire', async () => {
			const limited = await createLimitedJob(1);
			const expired = await createTask({
				jobId: limited.id,
				runAt: new Date(Date.now() - 30_000),
				missedAfter: new Date(Date.now() - 60_000),
			});
			const ready = await createTask({
				jobId: limited.id,
				runAt: new Date(Date.now() - 20_000),
			});

			const claimed = await taskRepository.claimDueTasks(claimOpts());

			expect(claimed.map((task) => task.id)).toEqual([ready.id]);
			expect(await statusOf(expired.id)).toBe('pending');
			expect(await taskRepository.retireMissedPending(10)).toBe(1);
			expect(await statusOf(expired.id)).toBe('missed');
		});

		it('lets a retry past its deadline take a slot', async () => {
			const limited = await createLimitedJob(1);
			const retry = await createTask({
				jobId: limited.id,
				runAt: new Date(Date.now() - 30_000),
				missedAfter: new Date(Date.now() - 60_000),
				attempts: 1,
				maxAttempts: 2,
			});
			const next = await createTask({
				jobId: limited.id,
				runAt: new Date(Date.now() - 20_000),
			});

			const claimed = await taskRepository.claimDueTasks(claimOpts());

			expect(claimed.map((task) => task.id)).toEqual([retry.id]);
			expect(await statusOf(next.id)).toBe('pending');
		});

		it('fills the batch with other jobs when a limited job holds occurrences back', async () => {
			const limited = await createLimitedJob(1);
			for (const offset of [50_000, 40_000, 30_000]) {
				await createTask({ jobId: limited.id, runAt: new Date(Date.now() - offset) });
			}
			// Later than every limited task, so a cap applied after the batch size would skip them.
			const unlimitedA = await createTask({ runAt: new Date(Date.now() - 20_000) });
			const unlimitedB = await createTask({ runAt: new Date(Date.now() - 10_000) });

			const claimed = await taskRepository.claimDueTasks(claimOpts({ batchSize: 3 }));

			expect(claimed).toHaveLength(3);
			expect(claimed.map((t) => t.id)).toEqual(
				expect.arrayContaining([unlimitedA.id, unlimitedB.id]),
			);
			expect(await runningCountOf(limited.id)).toBe(1);
		});

		it('claims every due occurrence of an unlimited job', async () => {
			const unlimited = await createLimitedJob(null);
			const created = await Promise.all([
				createTask({ jobId: unlimited.id }),
				createTask({ jobId: unlimited.id }),
				createTask({ jobId: unlimited.id }),
			]);

			const claimed = await taskRepository.claimDueTasks(claimOpts());

			expect(new Set(claimed.map((t) => t.id))).toEqual(new Set(created.map((t) => t.id)));
		});

		it('never lets two concurrent claimers exceed a limit together', async () => {
			const limited = await createLimitedJob(1);
			await Promise.all([
				createTask({ jobId: limited.id }),
				createTask({ jobId: limited.id }),
				createTask({ jobId: limited.id }),
			]);

			const [a, b] = await Promise.all([
				taskRepository.claimDueTasks(claimOpts({ host: HOST_A })),
				taskRepository.claimDueTasks(claimOpts({ host: HOST_B })),
			]);

			expect(a.length + b.length).toBe(1);
			expect(await runningCountOf(limited.id)).toBe(1);
		});

		it('keeps claiming unlimited work while another claimer holds a limited job', async () => {
			const limited = await createLimitedJob(1);
			await createTask({ jobId: limited.id });
			const unlimited = await Promise.all([createTask(), createTask(), createTask(), createTask()]);

			const [a, b] = await Promise.all([
				taskRepository.claimDueTasks(claimOpts({ host: HOST_A })),
				taskRepository.claimDueTasks(claimOpts({ host: HOST_B })),
			]);

			const ids = [...a, ...b].map((t) => t.id);
			expect(new Set(ids).size).toBe(ids.length);
			expect(ids).toEqual(expect.arrayContaining(unlimited.map((t) => t.id)));
			expect(ids).toHaveLength(unlimited.length + 1);
		});

		// Only Postgres needs these checks. SQLite runs one claim at a time.
		describe.runIf(isPostgres)('across concurrent Postgres claimers', () => {
			const PAUSE_UPDATE = 46202026;
			const PAUSE_SNAPSHOT = 46202027;

			const jobTable = () => dataSource.driver.escape(jobRepository.metadata.tableName);
			const taskTable = () => dataSource.driver.escape(taskRepository.metadata.tableName);

			/** Settles once exactly one session is waiting on the given advisory lock. */
			const waitForBlockedOn = async (key: number) =>
				await expect
					.poll(
						async () => {
							const rows = await dataSource.query<Array<{ count: string }>>(
								`SELECT count(*) FROM pg_locks
								  WHERE locktype = 'advisory' AND objid = $1 AND NOT granted`,
								[key],
							);
							return Number(rows[0].count);
						},
						{ timeout: 5_000 },
					)
					.toBe(1);

			it('fills the batch from other jobs when a limited job is locked', async () => {
				const limited = await createLimitedJob(1);
				// Earlier than the other task, so a claim that waited for the lock would return it first.
				await createTask({ jobId: limited.id, runAt: new Date(Date.now() - 50_000) });
				const available = await createTask({ runAt: new Date(Date.now() - 10_000) });
				const locker = dataSource.createQueryRunner();
				await locker.connect();
				await locker.startTransaction();

				try {
					await locker.query(`SELECT "id" FROM ${jobTable()} WHERE "id" = $1 FOR NO KEY UPDATE`, [
						limited.id,
					]);

					const claimed = await taskRepository.claimDueTasks(claimOpts());

					expect(claimed.map((task) => task.id)).toEqual([available.id]);
					expect(await runningCountOf(limited.id)).toBe(0);
				} finally {
					await locker.rollbackTransaction();
					await locker.release();
				}
			});

			it('claims nothing on a snapshot taken before another claimer bumped the job', async () => {
				const limited = await createLimitedJob(1);
				const first = await createTask({
					jobId: limited.id,
					runAt: new Date(Date.now() - 30_000),
				});

				// Pause claim A inside its update, after it picks its tasks.
				await dataSource.query(`CREATE FUNCTION pause_claim_update() RETURNS trigger LANGUAGE plpgsql AS $$
						BEGIN
							IF NEW."claimedBy" = '${HOST_A}' THEN PERFORM pg_advisory_xact_lock(${PAUSE_UPDATE}); END IF;
							RETURN NEW;
						END $$`);
				await dataSource.query(`CREATE TRIGGER pause_claim_update BEFORE UPDATE ON ${taskTable()}
						FOR EACH ROW EXECUTE FUNCTION pause_claim_update()`);
				// Pause claim B after it reads the tasks, before it reaches the job row.
				await dataSource.query(`CREATE FUNCTION pause_claim_snapshot(types text[]) RETURNS text[] LANGUAGE plpgsql AS $$
						BEGIN
							PERFORM pg_advisory_xact_lock(${PAUSE_SNAPSHOT});
							RETURN types;
						END $$`);

				const barrier = dataSource.createQueryRunner();
				await barrier.connect();
				const originalQuery = taskRepository.query.bind(taskRepository);
				const querySpy = vi.spyOn(taskRepository, 'query');
				let claimA: Promise<ScheduledTask[]> | undefined;
				let claimB: Promise<ScheduledTask[]> | undefined;
				let a: ScheduledTask[] = [];
				let b: ScheduledTask[] = [];

				try {
					await barrier.query(`SELECT pg_advisory_lock(${PAUSE_UPDATE})`);
					await barrier.query(`SELECT pg_advisory_lock(${PAUSE_SNAPSHOT})`);

					claimA = taskRepository.claimDueTasks(claimOpts({ host: HOST_A }));
					await waitForBlockedOn(PAUSE_UPDATE);

					// An earlier task takes the job's only place, so B's old read would
					// pick a task that A never claimed.
					const earlier = new Date(first.runAt.getTime() - 1_000);
					await dataSource.transaction(
						async (manager) =>
							await taskRepository.insertIgnoringDuplicates(manager, [
								{
									jobId: limited.id,
									taskType: TASK_TYPE,
									payload: {},
									scheduledFor: earlier,
									runAt: earlier,
									maxAttempts: 1,
									missedAfter: null,
								},
							]),
					);

					querySpy.mockImplementation(
						async (sql: string, parameters?: unknown[]) =>
							await originalQuery(
								sql.replace('= ANY($3)', '= ANY(pause_claim_snapshot($3::text[]))'),
								parameters,
							),
					);
					claimB = taskRepository.claimDueTasks(claimOpts({ host: HOST_B }));
					await waitForBlockedOn(PAUSE_SNAPSHOT);

					await barrier.query(`SELECT pg_advisory_unlock(${PAUSE_UPDATE})`);
					a = await claimA;
					await barrier.query(`SELECT pg_advisory_unlock(${PAUSE_SNAPSHOT})`);
					b = await claimB;
				} finally {
					await barrier.query('SELECT pg_advisory_unlock_all()');
					if (claimA) a = await claimA;
					if (claimB) b = await claimB;
					querySpy.mockRestore();
					await barrier.release();
					await dataSource.query(`DROP TRIGGER pause_claim_update ON ${taskTable()}`);
					await dataSource.query('DROP FUNCTION pause_claim_update()');
					await dataSource.query('DROP FUNCTION pause_claim_snapshot(text[])');
				}

				expect(a.map((task) => task.id)).toEqual([first.id]);
				expect(b).toHaveLength(0);
				expect(await runningCountOf(limited.id)).toBe(1);
				// The claim must not change the job's data.
				expect(await jobRepository.findOneByOrFail({ id: limited.id })).toEqual(limited);
			}, 20_000);
		});
	});

	describe('guarded transitions', () => {
		// Returns the id plus the epoch the claim set (the fencing token a terminal
		// transition must present). First claim of a fresh row yields epoch 1.
		async function claimOne(): Promise<{ id: string; epoch: number }> {
			await createTask();
			const [claimed] = await taskRepository.claimDueTasks(claimOpts({ host: HOST_A }));
			return { id: claimed.id, epoch: claimed.leaseEpoch };
		}

		it('beginDispatch takes the dispatch mutex for the owner, stamps startedAt, refreshes the lease, and refuses a non-owner', async () => {
			const { id, epoch } = await claimOne();
			const leaseBefore = (await reload(id)).leaseExpiresAt!.getTime();

			// Non-owner wins no row and writes nothing.
			expect(
				await taskRepository.beginDispatch({ host: HOST_B, id, claimedEpoch: epoch }, 120_000),
			).toBe(0);
			expect((await reload(id)).startedAt).toBeNull();

			// Owner wins the mutex: 1 row, startedAt stamped, lease pushed out for the run.
			expect(
				await taskRepository.beginDispatch({ host: HOST_A, id, claimedEpoch: epoch }, 120_000),
			).toBe(1);
			const row = await reload(id);
			expect(row.startedAt).not.toBeNull();
			expect(row.leaseExpiresAt!.getTime()).toBeGreaterThan(leaseBefore);
		});

		it('beginDispatch is a one-shot per lease: a second call wins no row', async () => {
			const { id, epoch } = await claimOne();

			expect(
				await taskRepository.beginDispatch({ host: HOST_A, id, claimedEpoch: epoch }, 60_000),
			).toBe(1);
			// startedAt is now set, so the mutex is taken: the handler cannot be run twice on
			// this lease (the executor's at-most-once-execute guarantee).
			expect(
				await taskRepository.beginDispatch({ host: HOST_A, id, claimedEpoch: epoch }, 60_000),
			).toBe(0);
		});

		it('serialises concurrent beginDispatch calls: exactly one wins the mutex', async () => {
			// The at-most-once-execute guarantee under contention: several fires racing the
			// same claim (e.g. a duplicated timer, or a reclaim in flight) must not all run
			// the handler. The `startedAt IS NULL` guard plus row locking make the UPDATE an
			// atomic compare-and-set, so exactly one call affects the row and gets 1.
			const { id, epoch } = await claimOne();

			const results = await Promise.all(
				Array.from(
					{ length: 5 },
					async () =>
						await taskRepository.beginDispatch({ host: HOST_A, id, claimedEpoch: epoch }, 60_000),
				),
			);

			expect(results.filter((n) => n === 1)).toHaveLength(1); // exactly one winner
			expect(results.filter((n) => n === 0)).toHaveLength(4); // the rest are benign no-ops
			expect((await reload(id)).startedAt).not.toBeNull();
		});

		it('markDispatched stamps dispatchedAt for the owner, and is a no-op for a non-owner host', async () => {
			const { id, epoch } = await claimOne();

			expect(await taskRepository.markDispatched({ host: HOST_B, id, claimedEpoch: epoch })).toBe(
				0,
			);
			expect((await reload(id)).dispatchedAt).toBeNull();

			expect(await taskRepository.markDispatched({ host: HOST_A, id, claimedEpoch: epoch })).toBe(
				1,
			);
			expect((await reload(id)).dispatchedAt).not.toBeNull();
		});

		it('markDispatched is not fenced on an existing marker (at-least-once allows redelivery)', async () => {
			const { id, epoch } = await claimOne();

			expect(await taskRepository.markDispatched({ host: HOST_A, id, claimedEpoch: epoch })).toBe(
				1,
			);
			expect((await reload(id)).dispatchedAt).not.toBeNull();

			// A redelivered occurrence is allowed back to its handler, so a second
			// `markDispatched` at the same claim still lands (no `dispatchedAt IS NULL` fence).
			expect(await taskRepository.markDispatched({ host: HOST_A, id, claimedEpoch: epoch })).toBe(
				1,
			);
			expect((await reload(id)).dispatchedAt).not.toBeNull();
		});

		it('completeTask marks succeeded for the owner only', async () => {
			const { id, epoch } = await claimOne();

			expect(await taskRepository.completeTask({ host: HOST_B, id, claimedEpoch: epoch })).toBe(0);
			expect((await reload(id)).status).toBe('running'); // non-owner host left it untouched

			expect(await taskRepository.completeTask({ host: HOST_A, id, claimedEpoch: epoch })).toBe(1);

			const row = await reload(id);
			expect(row.status).toBe('succeeded');
			expect(row.finishedAt).not.toBeNull();
		});

		it('completeTask clears the error message of an earlier failed attempt', async () => {
			const { id, epoch } = await claimOne();
			expect(
				await taskRepository.rescheduleTask({ host: HOST_A, id, claimedEpoch: epoch }, 0, 'boom'),
			).toBe(1);
			expect((await reload(id)).errorMessage).toBe('boom');

			const [reclaimed] = await taskRepository.claimDueTasks(claimOpts({ host: HOST_A }));
			expect(reclaimed.id).toBe(id);
			expect(
				await taskRepository.completeTask({
					host: HOST_A,
					id,
					claimedEpoch: reclaimed.leaseEpoch,
				}),
			).toBe(1);

			const row = await reload(id);
			expect(row.status).toBe('succeeded');
			expect(row.attempts).toBe(1);
			expect(row.errorMessage).toBeNull();
		});

		it('failTaskTerminal marks failed and records the error and attempt', async () => {
			const { id, epoch } = await claimOne();

			// A non-owner host can't fail it.
			expect(
				await taskRepository.failTaskTerminal({ host: HOST_B, id, claimedEpoch: epoch }, 'nope'),
			).toBe(0);
			expect((await reload(id)).status).toBe('running');

			expect(
				await taskRepository.failTaskTerminal({ host: HOST_A, id, claimedEpoch: epoch }, 'kaboom'),
			).toBe(1);

			const row = await reload(id);
			expect(row.status).toBe('failed');
			expect(row.errorMessage).toBe('kaboom');
			expect(row.attempts).toBe(1);
			expect(row.finishedAt).not.toBeNull();
		});

		it('rescheduleTask returns the task to pending with backoff and a cleared claim', async () => {
			const { id, epoch } = await claimOne();

			// A non-owner host can't reschedule it.
			expect(
				await taskRepository.rescheduleTask(
					{ host: HOST_B, id, claimedEpoch: epoch },
					30_000,
					'nope',
				),
			).toBe(0);
			expect((await reload(id)).status).toBe('running');

			expect(
				await taskRepository.rescheduleTask(
					{ host: HOST_A, id, claimedEpoch: epoch },
					30_000,
					'retry me',
				),
			).toBe(1);

			const row = await reload(id);
			expect(row.status).toBe('pending');
			expect(row.attempts).toBe(1);
			expect(row.claimedBy).toBeNull();
			expect(row.leaseExpiresAt).toBeNull();
			expect(row.runAt.getTime()).toBeGreaterThan(Date.now());
		});

		it('releaseClaim returns the task to pending without counting an attempt', async () => {
			const { id, epoch } = await claimOne();

			// A non-owner host can't release it.
			expect(await taskRepository.releaseClaim({ host: HOST_B, id, claimedEpoch: epoch })).toBe(0);
			expect((await reload(id)).status).toBe('running');

			expect(await taskRepository.releaseClaim({ host: HOST_A, id, claimedEpoch: epoch })).toBe(1);

			const row = await reload(id);
			expect(row.status).toBe('pending');
			expect(row.attempts).toBe(0);
			expect(row.claimedBy).toBeNull();
			expect(row.leaseExpiresAt).toBeNull();
		});

		it('releaseClaim keeps the deadline, so a released occurrence still expires', async () => {
			const { id, epoch } = await claimOne();
			await taskRepository.update(id, { missedAfter: past() });

			expect(await taskRepository.releaseClaim({ host: HOST_A, id, claimedEpoch: epoch })).toBe(1);

			expect(await taskRepository.claimDueTasks(claimOpts({ host: HOST_A }))).toHaveLength(0);
			expect(await taskRepository.retireMissedPending(10)).toBe(1);
			expect((await reload(id)).status).toBe('missed');
		});

		it('fences a stale epoch: the owner at a superseded epoch cannot transition', async () => {
			// The same owner stalls, is reaped and reclaimed (epoch bumped), then its
			// stale `Executor.fire` tries to write. `claimedBy` still matches, so only
			// the epoch guard stops it: every terminal method must miss at the old epoch.
			const { id, epoch } = await claimOne();
			const stale = epoch + 1;

			expect(await taskRepository.markDispatched({ host: HOST_A, id, claimedEpoch: stale })).toBe(
				0,
			);
			expect(await taskRepository.completeTask({ host: HOST_A, id, claimedEpoch: stale })).toBe(0);
			expect(
				await taskRepository.failTaskTerminal({ host: HOST_A, id, claimedEpoch: stale }, 'x'),
			).toBe(0);
			expect(
				await taskRepository.rescheduleTask({ host: HOST_A, id, claimedEpoch: stale }, 1_000, 'x'),
			).toBe(0);
			expect(await taskRepository.releaseClaim({ host: HOST_A, id, claimedEpoch: stale })).toBe(0);

			const row = await reload(id);
			expect(row.status).toBe('running');
			expect(row.dispatchedAt).toBeNull();
		});

		it('treats a transition on a deleted row as a benign no-op (cascade-delete safety)', async () => {
			const { id, epoch } = await claimOne();
			await taskRepository.delete({ id });

			expect(await taskRepository.markDispatched({ host: HOST_A, id, claimedEpoch: epoch })).toBe(
				0,
			);
			expect(await taskRepository.completeTask({ host: HOST_A, id, claimedEpoch: epoch })).toBe(0);
			expect(
				await taskRepository.failTaskTerminal({ host: HOST_A, id, claimedEpoch: epoch }, 'x'),
			).toBe(0);
			expect(
				await taskRepository.rescheduleTask({ host: HOST_A, id, claimedEpoch: epoch }, 1_000, 'x'),
			).toBe(0);
			expect(await taskRepository.releaseClaim({ host: HOST_A, id, claimedEpoch: epoch })).toBe(0);
		});

		it('bumps the epoch again on re-claim after a reschedule', async () => {
			const { id, epoch } = await claimOne();
			await taskRepository.rescheduleTask({ host: HOST_A, id, claimedEpoch: epoch }, 0, 'retry');
			await taskRepository.update(id, { runAt: past() });

			const [reclaimed] = await taskRepository.claimDueTasks(claimOpts({ host: HOST_B }));
			expect(reclaimed.id).toBe(id);
			expect(reclaimed.leaseEpoch).toBe(2);
		});

		it('is a no-op for a repeated call by the same owner once the row has left running', async () => {
			// The guard is {id, status: 'running', claimedBy, leaseEpoch}, not just claimedBy:
			// once completeTask moves the row to 'succeeded', a second call from the very
			// same owner (e.g. a stale retry after a reap+reclaim) must no longer match.
			const { id, epoch } = await claimOne();
			expect(await taskRepository.completeTask({ host: HOST_A, id, claimedEpoch: epoch })).toBe(1);

			expect(await taskRepository.completeTask({ host: HOST_A, id, claimedEpoch: epoch })).toBe(0);
			expect(await taskRepository.markDispatched({ host: HOST_A, id, claimedEpoch: epoch })).toBe(
				0,
			);

			const row = await reload(id);
			expect(row.status).toBe('succeeded');
		});
	});

	describe('epoch fencing on guarded transitions', () => {
		async function claimOne(): Promise<{ id: string; epoch: number }> {
			await createTask();
			const [claimed] = await taskRepository.claimDueTasks(claimOpts({ host: HOST_A }));
			return { id: claimed.id, epoch: claimed.leaseEpoch };
		}

		it('rejects a terminal transition carrying a stale epoch, then accepts the current one', async () => {
			const { id, epoch } = await claimOne();

			// A stale epoch (one behind the row's live lease) matches no row: the owner
			// and status still line up, but the fencing token doesn't.
			expect(await taskRepository.completeTask({ host: HOST_A, id, claimedEpoch: epoch - 1 })).toBe(
				0,
			);
			expect((await reload(id)).status).toBe('running');

			// The epoch the claim actually set transitions the row.
			expect(await taskRepository.completeTask({ host: HOST_A, id, claimedEpoch: epoch })).toBe(1);
			expect((await reload(id)).status).toBe('succeeded');
		});

		it('fences every guarded transition on a stale epoch', async () => {
			// Each transition is checked in isolation on its own claimed row, so a stale
			// epoch is a 0-row no-op regardless of which transition the stalled owner calls.
			const start = await claimOne();
			expect(
				await taskRepository.markDispatched({
					host: HOST_A,
					id: start.id,
					claimedEpoch: start.epoch - 1,
				}),
			).toBe(0);
			expect((await reload(start.id)).dispatchedAt).toBeNull();

			const fail = await claimOne();
			expect(
				await taskRepository.failTaskTerminal(
					{ host: HOST_A, id: fail.id, claimedEpoch: fail.epoch - 1 },
					'x',
				),
			).toBe(0);
			expect((await reload(fail.id)).status).toBe('running');

			const resched = await claimOne();
			expect(
				await taskRepository.rescheduleTask(
					{ host: HOST_A, id: resched.id, claimedEpoch: resched.epoch - 1 },
					0,
					'x',
				),
			).toBe(0);
			expect((await reload(resched.id)).status).toBe('running');

			const release = await claimOne();
			expect(
				await taskRepository.releaseClaim({
					host: HOST_A,
					id: release.id,
					claimedEpoch: release.epoch - 1,
				}),
			).toBe(0);
			expect((await reload(release.id)).status).toBe('running');
		});

		it('fences a stalled same-host owner after its lease is reclaimed under the same host', async () => {
			// Owner claims (epoch 1), then stalls. Its lease lapses and the row is reclaimed
			// by the very same host: make it pending+due again and re-claim, which bumps the
			// epoch to 2. The stalled owner's terminal call still carries epoch 1, so it must
			// be a 0-row no-op; the reclaim's epoch 2 owns the row.
			const { id, epoch } = await claimOne();
			expect(epoch).toBe(1);

			// Simulate the reap: return the row to a claimable state, then re-claim on HOST_A.
			await taskRepository.update(
				{ id },
				{ status: 'pending', claimedBy: null, leaseExpiresAt: null },
			);
			const [reclaimed] = await taskRepository.claimDueTasks(claimOpts({ host: HOST_A }));
			expect(reclaimed.id).toBe(id);
			expect(reclaimed.leaseEpoch).toBe(2);

			// Same host, same id, but the stale epoch fences the transition out.
			expect(await taskRepository.completeTask({ host: HOST_A, id, claimedEpoch: epoch })).toBe(0);
			expect((await reload(id)).status).toBe('running');

			// The reclaim's current epoch transitions it.
			expect(
				await taskRepository.completeTask({ host: HOST_A, id, claimedEpoch: reclaimed.leaseEpoch }),
			).toBe(1);
			expect((await reload(id)).status).toBe('succeeded');
		});
	});

	describe('reaper primitives', () => {
		// A `running` row with an already-past lease: what the reaper sweep recovers.
		// The running-lease CHECK only requires a lease to be present, not future.
		async function createExpiredRunning(
			overrides: Partial<ScheduledTask> = {},
		): Promise<ScheduledTask> {
			return await createTask({
				status: 'running',
				claimedBy: HOST_A,
				leaseExpiresAt: past(),
				leaseEpoch: 1,
				// A running row whose lease lapsed after the owner started it (`beginDispatch` ran)
				// but before the effect was handed off: the pre-dispatch shape the reaper reclaims
				// or dead-letters. Post-dispatch cases override `dispatchedAt` with a timestamp.
				startedAt: past(),
				dispatchedAt: null,
				maxAttempts: 3,
				...overrides,
			});
		}

		describe('findExpiredLeases', () => {
			it('returns only running rows whose lease has expired', async () => {
				const expired = await createExpiredRunning();
				// Running but lease still live: not yet reapable.
				await createExpiredRunning({ leaseExpiresAt: new Date(Date.now() + 60_000) });
				// Pending: never reapable (no lease held).
				await createTask({ status: 'pending' });

				const found = await taskRepository.findExpiredLeases(10);

				expect(found.map((t) => t.id)).toEqual([expired.id]);
			});

			it('caps the sweep at the given limit, oldest expiry first', async () => {
				const older = await createExpiredRunning({ leaseExpiresAt: new Date(Date.now() - 90_000) });
				await createExpiredRunning({ leaseExpiresAt: new Date(Date.now() - 30_000) });

				const found = await taskRepository.findExpiredLeases(1);

				expect(found.map((t) => t.id)).toEqual([older.id]);
			});

			it('reaps a lease that expired a moment ago (boundary)', async () => {
				// The WHERE clause is strictly `leaseExpiresAt < now()`. Expiring 1ms in the
				// past keeps the lease unambiguously below the DB clock, so this pins the
				// comparison to `<` rather than an off-by-one variant that would exclude it.
				const task = await createExpiredRunning({ leaseExpiresAt: new Date(Date.now() - 1) });

				const found = await taskRepository.findExpiredLeases(10);

				expect(found.map((t) => t.id)).toContain(task.id);
			});
		});

		describe('reclaimExpired', () => {
			it('returns the task to pending: attempt counted, runAt pushed, epoch bumped, claim cleared', async () => {
				const task = await createExpiredRunning({ attempts: 0, maxAttempts: 3, leaseEpoch: 2 });

				expect(
					await taskRepository.reclaimExpired(
						{ id: task.id, claimedEpoch: 2 },
						30_000,
						'lease expired',
					),
				).toBe(1);

				const row = await reload(task.id);
				expect(row.status).toBe('pending');
				expect(row.attempts).toBe(1);
				expect(row.leaseEpoch).toBe(3); // bumped, so a stalled owner at epoch 2 is fenced
				expect(row.claimedBy).toBeNull();
				expect(row.leaseExpiresAt).toBeNull();
				expect(row.errorMessage).toBe('lease expired');
				expect(row.runAt.getTime()).toBeGreaterThan(Date.now());
			});

			it('clears the dispatch mutex (startedAt) on reclaim so the redelivery can re-acquire it', async () => {
				// Reclaim is the pre-dispatch path: the reaper only reclaims a row whose
				// effect never landed (`dispatchedAt` null).
				const task = await createExpiredRunning({
					leaseEpoch: 2,
					startedAt: past(),
					dispatchedAt: null,
				});

				expect(
					await taskRepository.reclaimExpired(
						{ id: task.id, claimedEpoch: 2 },
						30_000,
						'lease expired',
					),
				).toBe(1);

				// `startedAt` is cleared so the next attempt re-acquires the `beginDispatch` mutex,
				// and `dispatchedAt` stays null (the effect still has not happened).
				const row = await reload(task.id);
				expect(row.startedAt).toBeNull();
				expect(row.dispatchedAt).toBeNull();
			});

			it('is a no-op at a stale epoch (a concurrent reaper already reclaimed it)', async () => {
				const task = await createExpiredRunning({ leaseEpoch: 5 });

				expect(
					await taskRepository.reclaimExpired({ id: task.id, claimedEpoch: 4 }, 30_000, 'x'),
				).toBe(0);
				expect((await reload(task.id)).status).toBe('running');
			});

			it('is a no-op once the owner finished the row (status left running)', async () => {
				// completeTask/failTaskTerminal leave a past leaseExpiresAt on the row, so
				// only the `status = running` guard stops the reaper resurrecting a row the
				// owner completed between the sweep's read and this write.
				const task = await createExpiredRunning({ status: 'succeeded', leaseEpoch: 1 });

				expect(
					await taskRepository.reclaimExpired({ id: task.id, claimedEpoch: 1 }, 30_000, 'x'),
				).toBe(0);
				expect((await reload(task.id)).status).toBe('succeeded');
			});

			it('is a no-op when the lease is still live (renewed since the sweep read)', async () => {
				const task = await createExpiredRunning({
					leaseEpoch: 1,
					leaseExpiresAt: new Date(Date.now() + 60_000),
				});

				expect(
					await taskRepository.reclaimExpired({ id: task.id, claimedEpoch: 1 }, 30_000, 'x'),
				).toBe(0);
				expect((await reload(task.id)).status).toBe('running');
			});

			it('is a no-op on a deleted row', async () => {
				const task = await createExpiredRunning();
				await taskRepository.delete({ id: task.id });

				expect(
					await taskRepository.reclaimExpired({ id: task.id, claimedEpoch: 1 }, 30_000, 'x'),
				).toBe(0);
			});

			it('never lets two concurrent reapers reclaim the same expired lease', async () => {
				// Same guard mechanics as claimDueTasks' concurrent-claimers test, but here
				// both calls carry identical args (same epoch) against the same row: the
				// first write's own epoch bump must fence the second out, not merely
				// coincidental row-locking.
				const task = await createExpiredRunning({ leaseEpoch: 1, attempts: 0 });

				const [a, b] = await Promise.all([
					taskRepository.reclaimExpired({ id: task.id, claimedEpoch: 1 }, 30_000, 'lease expired'),
					taskRepository.reclaimExpired({ id: task.id, claimedEpoch: 1 }, 30_000, 'lease expired'),
				]);

				expect([a, b].sort()).toEqual([0, 1]); // exactly one call reclaimed the row

				const row = await reload(task.id);
				expect(row.status).toBe('pending');
				expect(row.attempts).toBe(1); // counted once, not twice
				expect(row.leaseEpoch).toBe(2); // bumped once, not twice
			});

			it('is a no-op on a dispatched row: a dispatched occurrence is completed, not reclaimed', async () => {
				// The pre-dispatch fence (`dispatchedAt IS NULL`) stops the reaper redelivering an
				// occurrence whose effect already happened, e.g. a marker that landed after the
				// sweep's read. The next sweep then completes it.
				const task = await createExpiredRunning({
					leaseEpoch: 1,
					attempts: 0,
					dispatchedAt: past(),
				});

				expect(
					await taskRepository.reclaimExpired({ id: task.id, claimedEpoch: 1 }, 30_000, 'x'),
				).toBe(0);
				expect((await reload(task.id)).status).toBe('running');
			});
		});

		describe('deadLetterExpired', () => {
			it('fails the task terminally, counting the attempt and stamping finishedAt', async () => {
				const task = await createExpiredRunning({ attempts: 0, maxAttempts: 1, leaseEpoch: 1 });

				expect(
					await taskRepository.deadLetterExpired({ id: task.id, claimedEpoch: 1 }, 'lease expired'),
				).toBe(1);

				const row = await reload(task.id);
				expect(row.status).toBe('failed');
				expect(row.attempts).toBe(1);
				expect(row.finishedAt).not.toBeNull();
				expect(row.errorMessage).toBe('lease expired');
			});

			it('is a no-op at a stale epoch', async () => {
				const task = await createExpiredRunning({ leaseEpoch: 5 });

				expect(await taskRepository.deadLetterExpired({ id: task.id, claimedEpoch: 4 }, 'x')).toBe(
					0,
				);
				expect((await reload(task.id)).status).toBe('running');
			});

			it('is a no-op once the owner finished the row (status left running)', async () => {
				// Same rationale as reclaimExpired: the `status = running` guard alone stops
				// the reaper dead-lettering a row the owner completed between the sweep's
				// read and this write.
				const task = await createExpiredRunning({ status: 'succeeded', leaseEpoch: 1 });

				expect(await taskRepository.deadLetterExpired({ id: task.id, claimedEpoch: 1 }, 'x')).toBe(
					0,
				);
				expect((await reload(task.id)).status).toBe('succeeded');
			});

			it('is a no-op when the lease is still live (renewed since the sweep read)', async () => {
				const task = await createExpiredRunning({
					leaseEpoch: 1,
					leaseExpiresAt: new Date(Date.now() + 60_000),
				});

				expect(await taskRepository.deadLetterExpired({ id: task.id, claimedEpoch: 1 }, 'x')).toBe(
					0,
				);
				expect((await reload(task.id)).status).toBe('running');
			});

			it('is a no-op on a deleted row', async () => {
				const task = await createExpiredRunning();
				await taskRepository.delete({ id: task.id });

				expect(await taskRepository.deadLetterExpired({ id: task.id, claimedEpoch: 1 }, 'x')).toBe(
					0,
				);
			});

			it('never lets two concurrent reapers dead-letter the same expired lease', async () => {
				const task = await createExpiredRunning({ leaseEpoch: 1, attempts: 0, maxAttempts: 1 });

				const [a, b] = await Promise.all([
					taskRepository.deadLetterExpired({ id: task.id, claimedEpoch: 1 }, 'lease expired'),
					taskRepository.deadLetterExpired({ id: task.id, claimedEpoch: 1 }, 'lease expired'),
				]);

				expect([a, b].sort()).toEqual([0, 1]); // exactly one call dead-lettered the row

				const row = await reload(task.id);
				expect(row.status).toBe('failed');
				expect(row.attempts).toBe(1); // counted once, not twice
			});

			it('is a no-op on a dispatched row: a dispatched occurrence is never failed', async () => {
				// The pre-dispatch fence (`dispatchedAt IS NULL`) keeps a dispatch marker that
				// landed during the sweep from being overwritten with a terminal failure.
				const task = await createExpiredRunning({
					leaseEpoch: 1,
					attempts: 0,
					maxAttempts: 1,
					dispatchedAt: past(),
				});

				expect(await taskRepository.deadLetterExpired({ id: task.id, claimedEpoch: 1 }, 'x')).toBe(
					0,
				);
				expect((await reload(task.id)).status).toBe('running');
			});
		});

		describe('completeExpired', () => {
			it('completes the task as succeeded, stamping finishedAt and clearing an earlier error', async () => {
				const task = await createExpiredRunning({
					attempts: 1,
					maxAttempts: 3,
					leaseEpoch: 1,
					dispatchedAt: past(),
					errorMessage: 'boom',
				});

				expect(await taskRepository.completeExpired({ id: task.id, claimedEpoch: 1 })).toBe(1);

				const row = await reload(task.id);
				expect(row.status).toBe('succeeded');
				expect(row.finishedAt).not.toBeNull();
				expect(row.errorMessage).toBeNull();
			});

			it('is a no-op at a stale epoch', async () => {
				const task = await createExpiredRunning({ leaseEpoch: 5, dispatchedAt: past() });

				expect(await taskRepository.completeExpired({ id: task.id, claimedEpoch: 4 })).toBe(0);
				expect((await reload(task.id)).status).toBe('running');
			});

			it('is a no-op when the lease is still live (renewed since the sweep read)', async () => {
				const task = await createExpiredRunning({
					leaseEpoch: 1,
					leaseExpiresAt: new Date(Date.now() + 60_000),
					dispatchedAt: past(),
				});

				expect(await taskRepository.completeExpired({ id: task.id, claimedEpoch: 1 })).toBe(0);
				expect((await reload(task.id)).status).toBe('running');
			});

			it('is a no-op on a pre-dispatch row: the effect never happened, so it is not completed', async () => {
				// The post-dispatch fence (`dispatchedAt IS NOT NULL`) keeps a never-dispatched
				// row out of the completion path, so a marker that has not landed cannot be
				// mistaken for a done effect.
				const task = await createExpiredRunning({ leaseEpoch: 1, dispatchedAt: null });

				expect(await taskRepository.completeExpired({ id: task.id, claimedEpoch: 1 })).toBe(0);
				expect((await reload(task.id)).status).toBe('running');
			});

			it('never lets two concurrent reapers complete the same expired lease', async () => {
				const task = await createExpiredRunning({ leaseEpoch: 1, dispatchedAt: past() });

				const [a, b] = await Promise.all([
					taskRepository.completeExpired({ id: task.id, claimedEpoch: 1 }),
					taskRepository.completeExpired({ id: task.id, claimedEpoch: 1 }),
				]);

				expect([a, b].sort()).toEqual([0, 1]); // exactly one call completed the row
				expect((await reload(task.id)).status).toBe('succeeded');
			});
		});

		describe('retireMissedPending', () => {
			it('retires a pending occurrence the claim has stopped offering', async () => {
				const stale = await createTask({
					runAt: past(),
					missedAfter: new Date(Date.now() - 30_000),
				});

				expect(await taskRepository.retireMissedPending(10)).toBe(1);

				const row = await reload(stale.id);
				expect(row.status).toBe('missed');
				expect(row.finishedAt).not.toBeNull();
			});

			it('leaves alone what the claim would still offer', async () => {
				// Mirrors the three cases `claimDueTasks` still accepts.
				const live = await createTask({ missedAfter: new Date(Date.now() + 30_000) });
				const noDeadline = await createTask({ missedAfter: null });
				const retry = await createTask({
					missedAfter: new Date(Date.now() - 30_000),
					attempts: 1,
					maxAttempts: 3,
				});

				expect(await taskRepository.retireMissedPending(10)).toBe(0);

				for (const task of [live, noDeadline, retry]) {
					expect((await reload(task.id)).status).toBe('pending');
				}
			});

			it('leaves a claimed occurrence alone', async () => {
				const running = await createTask({
					status: 'running',
					claimedBy: HOST_A,
					leaseExpiresAt: new Date(Date.now() + 60_000),
					missedAfter: new Date(Date.now() - 30_000),
				});

				expect(await taskRepository.retireMissedPending(10)).toBe(0);
				expect((await reload(running.id)).status).toBe('running');
			});

			it('caps the sweep at the given limit', async () => {
				await createTask({ missedAfter: new Date(Date.now() - 30_000) });
				await createTask({ missedAfter: new Date(Date.now() - 60_000) });

				expect(await taskRepository.retireMissedPending(1)).toBe(1);
			});
		});
	});

	describe('updateToMissed', () => {
		it('retires the pending occurrences older than the catch-up run that replaces them', async () => {
			const older = await createTask();
			const newer = await createTask();
			const catchUp = await createTask();

			const retired = await taskRepository.updateToMissed(taskRepository.manager, [
				{ jobId: job.id, before: catchUp.scheduledFor },
			]);

			expect(retired).toBe(2);
			for (const task of [older, newer]) {
				expect((await reload(task.id)).status).toBe('missed');
			}
			expect((await reload(catchUp.id)).status).toBe('pending');
		});

		it('leaves an occurrence that is already running or finished', async () => {
			const running = await createTask({
				status: 'running',
				claimedBy: HOST_A,
				leaseExpiresAt: new Date(Date.now() + 60_000),
			});
			const done = await createTask({ status: 'succeeded', finishedAt: past() });
			const catchUp = await createTask();

			const retired = await taskRepository.updateToMissed(taskRepository.manager, [
				{ jobId: job.id, before: catchUp.scheduledFor },
			]);

			expect(retired).toBe(0);
			expect((await reload(running.id)).status).toBe('running');
			expect((await reload(done.id)).status).toBe('succeeded');
		});

		it('retires nothing when given nothing', async () => {
			await createTask();

			expect(await taskRepository.updateToMissed(taskRepository.manager, [])).toBe(0);
		});

		it('retires an occurrence whose retry is already scheduled, same as one never attempted', async () => {
			// Coalesce means at most one run for the backlog: a failed attempt awaiting
			// retry is still a second run alongside the catch-up if left alone.
			const retrying = await createTask({ attempts: 1 });
			const catchUp = await createTask();

			const retired = await taskRepository.updateToMissed(taskRepository.manager, [
				{ jobId: job.id, before: catchUp.scheduledFor },
			]);

			expect(retired).toBe(1);
			expect((await reload(retrying.id)).status).toBe('missed');
		});

		it('applies each job its own cutoff in a single call, without crossing jobs', async () => {
			const jobName = `job-${Math.random().toString(36).slice(2)}`;
			const otherJob = await jobRepository.save(
				jobRepository.create({
					name: jobName,
					...selfOwned(jobName),
					taskType: TASK_TYPE,
					payload: {},
					kind: 'interval',
					intervalSeconds: 60,
					enabled: true,
					nextRunAt: new Date('2026-01-01T00:00:00.000Z'),
					maxAttempts: 1,
				}),
			);
			const superseded = await createTask();
			const catchUp = await createTask();
			const otherSuperseded = await createTask({ jobId: otherJob.id });
			// Older than otherCatchUp, so it would match otherJob's bracket by jobId and
			// scheduledFor alone: proves the status filter still applies to every job's
			// bracket, not only the first.
			const otherRunning = await createTask({
				jobId: otherJob.id,
				status: 'running',
				claimedBy: HOST_A,
				leaseExpiresAt: new Date(Date.now() + 60_000),
			});
			const otherCatchUp = await createTask({ jobId: otherJob.id });

			const retired = await taskRepository.updateToMissed(taskRepository.manager, [
				{ jobId: job.id, before: catchUp.scheduledFor },
				{ jobId: otherJob.id, before: otherCatchUp.scheduledFor },
			]);

			expect(retired).toBe(2);
			expect((await reload(superseded.id)).status).toBe('missed');
			expect((await reload(catchUp.id)).status).toBe('pending');
			expect((await reload(otherSuperseded.id)).status).toBe('missed');
			expect((await reload(otherRunning.id)).status).toBe('running');
			expect((await reload(otherCatchUp.id)).status).toBe('pending');
		});
	});

	describe('updateMissedAfterForJobs', () => {
		it("recomputes a pending row's deadline from its own future runAt", async () => {
			const runAt = new Date(Date.now() + 60_000);
			const task = await createTask({ runAt, missedAfter: new Date(runAt.getTime() + 30_000) });

			await taskRepository.updateMissedAfterForJobs(taskRepository.manager, [job.id], 90);

			const reloaded = await reload(task.id);
			expect(reloaded.missedAfter!.getTime()).toBe(runAt.getTime() + 90_000);
		});

		it("clamps an overdue-but-still-live row's recomputed deadline to now", async () => {
			const runAt = past();
			const missedAfter = new Date(Date.now() + 60_000);
			const task = await createTask({ runAt, missedAfter });

			// DB-clock brackets, not `Date.now()`: a container's clock can drift from
			// the test runner's host clock.
			const before = await taskRepository.readDbTime();
			await taskRepository.updateMissedAfterForJobs(taskRepository.manager, [job.id], 90);
			const after = await taskRepository.readDbTime();

			const reloaded = await reload(task.id);
			const deadline = reloaded.missedAfter!.getTime();
			expect(deadline).toBeGreaterThanOrEqual(before.getTime() + 90_000);
			expect(deadline).toBeLessThanOrEqual(after.getTime() + 90_000);
		});

		it('leaves a row whose deadline has already passed alone', async () => {
			const runAt = past();
			const missedAfter = new Date(runAt.getTime() + 30_000);
			const task = await createTask({ runAt, missedAfter });

			await taskRepository.updateMissedAfterForJobs(taskRepository.manager, [job.id], 90);

			expect((await reload(task.id)).missedAfter!.getTime()).toBe(missedAfter.getTime());
		});

		it('leaves a row with no deadline without one', async () => {
			const task = await createTask({ missedAfter: null });

			await taskRepository.updateMissedAfterForJobs(taskRepository.manager, [job.id], 90);

			expect((await reload(task.id)).missedAfter).toBeNull();
		});

		it('leaves a running or finished row alone', async () => {
			const runAt = past();
			const running = await createTask({
				status: 'running',
				claimedBy: HOST_A,
				leaseExpiresAt: new Date(Date.now() + 60_000),
				runAt,
				missedAfter: new Date(runAt.getTime() + 30_000),
			});
			const done = await createTask({
				status: 'succeeded',
				finishedAt: past(),
				runAt,
				missedAfter: new Date(runAt.getTime() + 30_000),
			});

			await taskRepository.updateMissedAfterForJobs(taskRepository.manager, [job.id], 90);

			expect((await reload(running.id)).missedAfter!.getTime()).toBe(runAt.getTime() + 30_000);
			expect((await reload(done.id)).missedAfter!.getTime()).toBe(runAt.getTime() + 30_000);
		});

		it("leaves another job's rows alone", async () => {
			const otherJob = await jobRepository.save(
				jobRepository.create({ ...job, id: undefined, name: 'other-job' }),
			);
			const runAt = past();
			const otherTask = await taskRepository.save(
				taskRepository.create({
					jobId: otherJob.id,
					taskType: TASK_TYPE,
					payload: {},
					scheduledFor: new Date(),
					runAt,
					status: 'pending',
					attempts: 0,
					maxAttempts: 1,
					missedAfter: new Date(runAt.getTime() + 30_000),
				}),
			);

			await taskRepository.updateMissedAfterForJobs(taskRepository.manager, [job.id], 90);

			expect((await reload(otherTask.id)).missedAfter!.getTime()).toBe(runAt.getTime() + 30_000);
		});

		it('is a no-op when given no jobs', async () => {
			const runAt = past();
			const task = await createTask({ runAt, missedAfter: new Date(runAt.getTime() + 30_000) });

			await taskRepository.updateMissedAfterForJobs(taskRepository.manager, [], 90);

			expect((await reload(task.id)).missedAfter!.getTime()).toBe(runAt.getTime() + 30_000);
		});
	});
});
