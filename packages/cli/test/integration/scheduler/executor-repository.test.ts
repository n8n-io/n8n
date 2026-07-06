import { testDb } from '@n8n/backend-test-utils';
import type { ScheduledJob as ScheduledJobEntity, ScheduledTask } from '@n8n/db';
import { ScheduledJobRepository, ScheduledTaskRepository } from '@n8n/db';
import { Container } from '@n8n/di';

/**
 * Real-DB coverage for the claim/lease/terminal behaviour the executor relies on,
 * across cli's sqlite + postgres matrix (the dialect-split locking is the point).
 * Due-ness uses the DB clock, so tasks are made due with a `runAt` in the past.
 */
describe('ScheduledTaskRepository executor methods', () => {
	const TASK_TYPE = 'scheduleTrigger';
	const HOST_A = 'main-a';
	const HOST_B = 'main-b';
	// Comfortably-past instant, computed per call (not at module load) so a slow suite
	// can't drift it towards now().
	const past = () => new Date(Date.now() - 60_000);

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
		await testDb.init();
		jobRepository = Container.get(ScheduledJobRepository);
		taskRepository = Container.get(ScheduledTaskRepository);
	});

	beforeEach(async () => {
		await testDb.truncate(['ScheduledTask', 'ScheduledJob']);
		job = await jobRepository.save(
			jobRepository.create({
				name: `job-${Math.random().toString(36).slice(2)}`,
				workflowId: null,
				nodeId: null,
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

		it('claims every due occurrence of a job (supersede is deferred to the reaper)', async () => {
			// Two due occurrences of the same job: both are claimable. Skipping a
			// superseded occurrence needs the misfire grace/policy and lands later.
			const older = await createTask({
				scheduledFor: new Date('2026-06-01T10:00:00.000Z'),
				runAt: new Date(Date.now() - 40_000),
			});
			const newer = await createTask({
				scheduledFor: new Date('2026-06-01T11:00:00.000Z'),
				runAt: new Date(Date.now() - 20_000),
			});

			const claimed = await taskRepository.claimDueTasks(claimOpts());

			expect(claimed.map((t) => t.id).sort()).toEqual([older.id, newer.id].sort());
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

	describe('guarded transitions', () => {
		// Returns the id plus the epoch the claim set (the fencing token a terminal
		// transition must present). First claim of a fresh row yields epoch 1.
		async function claimOne(): Promise<{ id: string; epoch: number }> {
			await createTask();
			const [claimed] = await taskRepository.claimDueTasks(claimOpts({ host: HOST_A }));
			return { id: claimed.id, epoch: claimed.leaseEpoch };
		}

		it('markStarted sets startedAt for the owner, and is a no-op for a non-owner host', async () => {
			const { id, epoch } = await claimOne();

			expect(await taskRepository.markStarted({ host: HOST_B, id, claimedEpoch: epoch })).toBe(0);
			expect((await reload(id)).startedAt).toBeNull();

			expect(await taskRepository.markStarted({ host: HOST_A, id, claimedEpoch: epoch })).toBe(1);
			expect((await reload(id)).startedAt).not.toBeNull();
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

		it('treats a transition on a deleted row as a benign no-op (cascade-delete safety)', async () => {
			const { id, epoch } = await claimOne();
			await taskRepository.delete({ id });

			expect(await taskRepository.markStarted({ host: HOST_A, id, claimedEpoch: epoch })).toBe(0);
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

			const [reclaimed] = await taskRepository.claimDueTasks(claimOpts({ host: HOST_B }));
			expect(reclaimed.id).toBe(id);
			expect(reclaimed.leaseEpoch).toBe(2);
		});

		it('is a no-op for a repeated call by the same owner once the row has left running', async () => {
			// The guard is {id, status: 'running', claimedBy: host}, not just claimedBy=host:
			// once completeTask moves the row to 'succeeded', a second call from the very
			// same owner (e.g. a stale retry after a reap+reclaim) must no longer match.
			const { id, epoch } = await claimOne();
			expect(await taskRepository.completeTask({ host: HOST_A, id, claimedEpoch: epoch })).toBe(1);

			expect(await taskRepository.completeTask({ host: HOST_A, id, claimedEpoch: epoch })).toBe(0);
			expect(await taskRepository.markStarted({ host: HOST_A, id, claimedEpoch: epoch })).toBe(0);

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
				await taskRepository.markStarted({
					host: HOST_A,
					id: start.id,
					claimedEpoch: start.epoch - 1,
				}),
			).toBe(0);
			expect((await reload(start.id)).startedAt).toBeNull();

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
});
