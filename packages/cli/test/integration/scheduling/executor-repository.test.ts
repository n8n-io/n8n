import { testDb } from '@n8n/backend-test-utils';
import type { ScheduledJob as ScheduledJobEntity, ScheduledTask } from '@n8n/db';
import { ScheduledJobRepository, ScheduledTaskRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { selfOwned } from './shared/job-factory';

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
			it('completes the task as succeeded, stamping finishedAt without failing it', async () => {
				const task = await createExpiredRunning({
					attempts: 0,
					maxAttempts: 1,
					leaseEpoch: 1,
					dispatchedAt: past(),
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
