import { testDb } from '@n8n/backend-test-utils';
import { DataSource, ScheduledJobRepository, ScheduledTaskRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { createScheduler } from '@n8n/scheduler';
import type { ClaimedTask, Scheduler, SchedulerPasses } from '@n8n/scheduler';

import { buildMaterializerTransaction } from '@/scheduling/durable-scheduler';

import { retryUntil } from '../shared/retry-until';
import { createDueJobFactory, seedDueTask } from './shared/job-factory';

/**
 * Two scheduler instances sharing one database, the way two mains do in
 * production. The per-instance unit suites and the single-host integration test
 * prove each pass in isolation; this proves the cross-main guarantees the whole
 * point of the durable scheduler rests on: a due occurrence is claimed by
 * exactly one instance, a claim stranded by a dead instance is recovered by
 * another without the occurrence running twice, and a stranded claim on its
 * last attempt is dead-lettered rather than retried forever.
 */
describe('scheduler across two mains over one database', () => {
	const TASK_TYPE = 'integration-multi-main-test';

	let jobRepo: ScheduledJobRepository;
	let taskRepo: ScheduledTaskRepository;
	let createJob: ReturnType<typeof createDueJobFactory>;

	let mainA: Scheduler & SchedulerPasses;
	let mainB: Scheduler & SchedulerPasses;
	const executedA: ClaimedTask[] = [];
	const executedB: ClaimedTask[] = [];

	const buildMain = (hostId: string, executed: ClaimedTask[], batchSize: number) => {
		const scheduler = createScheduler({
			hostId,
			materializerTransaction: buildMaterializerTransaction(
				Container.get(DataSource),
				jobRepo,
				taskRepo,
			),
			taskStore: taskRepo,
			executor: { leaseSeconds: 30, lookaheadSeconds: 5, batchSize },
		});
		scheduler.registerTaskHandler(TASK_TYPE, {
			execute: async (task) => {
				executed.push(task);
			},
		});
		return scheduler;
	};

	beforeAll(async () => {
		await testDb.init();
		jobRepo = Container.get(ScheduledJobRepository);
		taskRepo = Container.get(ScheduledTaskRepository);
		createJob = createDueJobFactory(jobRepo, TASK_TYPE, 'job-mm');
		// A small batch so a single claim can't sweep the whole queue: both
		// instances must take part to drain it.
		mainA = buildMain('main-a', executedA, 5);
		mainB = buildMain('main-b', executedB, 5);
	});

	beforeEach(async () => {
		executedA.length = 0;
		executedB.length = 0;
		await testDb.truncate(['ScheduledTask', 'ScheduledJob']);
	});

	afterAll(async () => {
		await mainA.stop();
		await mainB.stop();
		await testDb.terminate();
	});

	it('claims each due occurrence on exactly one main and fires it once', async () => {
		const job = await createJob();
		const total = 10;
		for (let i = 0; i < total; i++) {
			await seedDueTask(taskRepo, TASK_TYPE, job.id, i);
		}

		// Both mains claim at the same instant, the contended case.
		const [claimedA, claimedB] = await Promise.all([mainA.execute(), mainB.execute()]);

		const idsA = claimedA.map((t) => t.id);
		const idsB = claimedB.map((t) => t.id);

		// Exactly-once at claim time: no occurrence is claimed by both mains, and
		// together they claim every occurrence.
		expect(idsA.filter((id) => idsB.includes(id))).toHaveLength(0);
		expect(new Set([...idsA, ...idsB]).size).toBe(total);
		// The small batch forced the work to split across both mains.
		expect(idsA.length).toBeGreaterThan(0);
		expect(idsB.length).toBeGreaterThan(0);

		await retryUntil(
			async () => expect(await taskRepo.countBy({ status: 'succeeded' })).toBe(total),
			{ timeoutMs: 10_000 },
		);

		// Each occurrence fired once, on the main that claimed it.
		expect(executedA.map((t) => t.id).sort()).toEqual([...idsA].sort());
		expect(executedB.map((t) => t.id).sort()).toEqual([...idsB].sort());
		expect(executedA.length + executedB.length).toBe(total);

		const rows = await taskRepo.findBy({ jobId: job.id });
		expect(rows.every((r) => r.status === 'succeeded')).toBe(true);
		expect(rows.every((r) => r.claimedBy === 'main-a' || r.claimedBy === 'main-b')).toBe(true);
	}, 15_000);

	it('recovers a claim stranded by a dead main and does not run it twice', async () => {
		const job = await createJob();
		const past = new Date(Date.now() - 60_000);
		// main-a claimed this occurrence, then died: the lease is expired and it
		// was never completed.
		const stranded = await taskRepo.save(
			taskRepo.create({
				jobId: job.id,
				taskType: TASK_TYPE,
				payload: {},
				scheduledFor: past,
				runAt: past,
				status: 'running',
				claimedBy: 'main-a',
				leaseExpiresAt: new Date(Date.now() - 1000),
				leaseEpoch: 1,
				attempts: 1,
				maxAttempts: 3,
			}),
		);

		// main-b's reaper reclaims the expired lease back to pending, bumping the
		// fencing epoch so main-a can no longer act on it.
		expect(await mainB.reap()).toEqual({ reclaimed: 1, deadLettered: 0 });

		// Reclaim pushes `runAt` out by the retry backoff; fast-forward past it so
		// the recovered occurrence is due for the next claim.
		await taskRepo.update({ id: stranded.id }, { runAt: new Date(Date.now() - 1000) });

		// main-b now claims and fires the recovered occurrence.
		const claimed = await mainB.execute();
		expect(claimed).toHaveLength(1);
		await retryUntil(
			async () => {
				const task = await taskRepo.findOneByOrFail({ id: stranded.id });
				expect(task.status).toBe('succeeded');
			},
			{ timeoutMs: 10_000 },
		);

		// main-a wakes up late and tries to complete the occurrence it lost. The
		// guard fences it: 0 rows, no second completion.
		const staleWrite = await taskRepo.completeTask({
			id: stranded.id,
			host: 'main-a',
			claimedEpoch: 1,
		});
		expect(staleWrite).toBe(0);

		// Ran exactly once, on main-b.
		expect(executedA).toHaveLength(0);
		expect(executedB).toHaveLength(1);
		const done = await taskRepo.findOneByOrFail({ id: stranded.id });
		expect(done.status).toBe('succeeded');
		expect(done.claimedBy).toBe('main-b');
	}, 15_000);

	it('dead-letters a claim stranded on its last attempt instead of reclaiming it', async () => {
		const job = await createJob({ maxAttempts: 3 });
		const past = new Date(Date.now() - 60_000);
		// main-a claimed this occurrence for its final attempt, then died: the
		// lease is expired with no attempts left, so the reaper fails it
		// terminally instead of retrying.
		const doomed = await taskRepo.save(
			taskRepo.create({
				jobId: job.id,
				taskType: TASK_TYPE,
				payload: {},
				scheduledFor: past,
				runAt: past,
				status: 'running',
				claimedBy: 'main-a',
				leaseExpiresAt: new Date(Date.now() - 1000),
				leaseEpoch: 1,
				attempts: 2,
				maxAttempts: 3,
			}),
		);

		expect(await mainB.reap()).toEqual({ reclaimed: 0, deadLettered: 1 });

		const done = await taskRepo.findOneByOrFail({ id: doomed.id });
		expect(done.status).toBe('failed');
		expect(done.attempts).toBe(3);
		expect(done.errorMessage).toMatch(/lease expired/i);

		// Terminal: a further reap sweep has nothing left to do, and the dead task
		// is never claimed or fired by either main.
		expect(await mainB.reap()).toEqual({ reclaimed: 0, deadLettered: 0 });
		expect(await mainA.execute()).toEqual([]);
		expect(await mainB.execute()).toEqual([]);
		expect(executedA).toHaveLength(0);
		expect(executedB).toHaveLength(0);
	}, 15_000);
});
