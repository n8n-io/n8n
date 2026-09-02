import { testDb } from '@n8n/backend-test-utils';
import type { ScheduledJob, ScheduledTask } from '@n8n/db';
import { DataSource, ScheduledJobRepository, ScheduledTaskRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { createScheduler } from '@n8n/scheduler';
import type { SchedulerDeps } from '@n8n/scheduler';

import { buildMaterializerTransaction } from '@/scheduling/durable-scheduler';

describe('scheduler retention', () => {
	let jobRepo: ScheduledJobRepository;
	let taskRepo: ScheduledTaskRepository;

	beforeAll(async () => {
		await testDb.init();
		jobRepo = Container.get(ScheduledJobRepository);
		taskRepo = Container.get(ScheduledTaskRepository);
	});

	beforeEach(async () => {
		await testDb.truncate(['ScheduledTask', 'ScheduledJob']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	let sequence = 0;
	const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 3600 * 1000);

	/** Compose a scheduler over the production storage bindings, with per-test retention windows. */
	const composeScheduler = (retention?: SchedulerDeps['retention']) =>
		createScheduler({
			hostId: 'retention-test',
			materializerTransaction: buildMaterializerTransaction(
				Container.get(DataSource),
				jobRepo,
				taskRepo,
			),
			taskStore: taskRepo,
			retention,
		});

	const createJob = async (overrides: Partial<ScheduledJob> = {}) =>
		await jobRepo.save(
			jobRepo.create({
				name: `job-${++sequence}`,
				taskType: 'test',
				payload: {},
				kind: 'interval',
				intervalSeconds: 3600,
				enabled: true,
				nextRunAt: daysAgo(0),
				maxAttempts: 1,
				...overrides,
			}),
		);

	const createTask = async (jobId: number, overrides: Partial<ScheduledTask> = {}) => {
		// Each row gets its own scheduledFor to satisfy the (jobId, scheduledFor) identity.
		const scheduledFor = new Date(Date.now() - ++sequence * 1000);
		return await taskRepo.save(
			taskRepo.create({
				jobId,
				taskType: 'test',
				payload: {},
				scheduledFor,
				runAt: scheduledFor,
				maxAttempts: 1,
				...overrides,
			}),
		);
	};

	it('prunes each terminal class on its own default window', async () => {
		const job = await createJob();
		// Default windows: cleanly finished kept 1 day, failed/missed kept 7 days.
		await createTask(job.id, { status: 'succeeded', finishedAt: daysAgo(2) });
		await createTask(job.id, { status: 'cancelled', finishedAt: daysAgo(2) });
		await createTask(job.id, { status: 'failed', finishedAt: daysAgo(8) });
		await createTask(job.id, { status: 'missed', finishedAt: daysAgo(8) });
		const freshSucceeded = await createTask(job.id, {
			status: 'succeeded',
			finishedAt: daysAgo(0.5),
		});
		// Failed two days ago: past the clean window but within the failed one,
		// so it stays around for debugging.
		const recentFailed = await createTask(job.id, { status: 'failed', finishedAt: daysAgo(2) });
		const pending = await createTask(job.id, { status: 'pending' });
		const running = await createTask(job.id, {
			status: 'running',
			claimedBy: 'main-1',
			leaseExpiresAt: daysAgo(2),
		});

		const summary = await composeScheduler().prune();

		expect(summary).toEqual({ deleted: 4, drained: true });
		const survivors = new Set((await taskRepo.find()).map((t) => t.id));
		expect(survivors).toEqual(
			new Set([freshSucceeded.id, recentFailed.id, pending.id, running.id]),
		);
	});

	it('drains a backlog across passes, the repository serving as the store directly', async () => {
		const job = await createJob();
		for (let i = 0; i < 5; i++) {
			await createTask(job.id, { status: 'succeeded', finishedAt: daysAgo(2) });
		}
		const retentionScheduler = composeScheduler({
			retentionSeconds: 24 * 3600,
			failedRetentionSeconds: 7 * 24 * 3600,
			batchSize: 2,
			maxBatchesPerPass: 1,
		});

		// One batch per pass: the first pass deletes batchSize rows and reports
		// the backlog it left behind.
		const first = await retentionScheduler.prune();
		expect(first).toEqual({ deleted: 2, drained: false });

		// Successive passes keep draining until a pass proves nothing is left.
		let deleted = first.deleted;
		for (let pass = 0; pass < 10 && deleted < 5; pass++) {
			const summary = await retentionScheduler.prune();
			deleted += summary.deleted;
		}

		expect(deleted).toBe(5);
		expect(await taskRepo.count()).toBe(0);
	});

	it('carries the pass budget across both windows against a real database', async () => {
		const job = await createJob();
		for (let i = 0; i < 3; i++) {
			await createTask(job.id, { status: 'succeeded', finishedAt: daysAgo(2) });
		}
		for (let i = 0; i < 2; i++) {
			await createTask(job.id, { status: 'failed', finishedAt: daysAgo(8) });
		}
		const retentionScheduler = composeScheduler({
			retentionSeconds: 24 * 3600,
			failedRetentionSeconds: 7 * 24 * 3600,
			batchSize: 2,
			maxBatchesPerPass: 3,
		});

		// The clean window drains in two batches (2 rows, then a short 1); the
		// failed window's reserved statement deletes a full batch, which spends
		// the budget without proving that window empty.
		const first = await retentionScheduler.prune();
		expect(first).toEqual({ deleted: 5, drained: false });
		expect(await taskRepo.count()).toBe(0);

		// The next pass probes both windows and proves the drain.
		const second = await retentionScheduler.prune();
		expect(second).toEqual({ deleted: 0, drained: true });
	});

	it('reports a no-op pass as drained with nothing deleted', async () => {
		const job = await createJob();
		const fresh = await createTask(job.id, { status: 'succeeded', finishedAt: daysAgo(0.5) });

		const summary = await composeScheduler().prune();

		expect(summary).toEqual({ deleted: 0, drained: true });
		expect((await taskRepo.find()).map((t) => t.id)).toEqual([fresh.id]);
	});

	it('prunes what the executor completes: the terminal write stamps the age retention reads', async () => {
		const job = await createJob();
		await createTask(job.id);

		// The executor's lifecycle against the same rows retention prunes: claim
		// the due task, then record its success — completeTask stamps finishedAt
		// with the DB clock, and that instant is what the cutoff compares against.
		const [claimed] = await taskRepo.claimDueTasks({
			host: 'main-1',
			taskTypes: ['test'],
			lookaheadMs: 0,
			leaseMs: 60_000,
			batchSize: 1,
		});
		expect(claimed).toBeDefined();
		await taskRepo.completeTask({
			host: 'main-1',
			id: claimed.id,
			claimedEpoch: claimed.leaseEpoch,
		});

		// Younger than a real window: kept.
		const kept = await taskRepo.deleteFinishedOlderThan({
			statuses: ['succeeded'],
			olderThanMs: 3_600_000,
			limit: 10,
		});
		expect(kept).toBe(0);

		// A zero cutoff ages out everything finished: the completed row goes.
		const pruned = await taskRepo.deleteFinishedOlderThan({
			statuses: ['succeeded'],
			olderThanMs: 0,
			limit: 10,
		});
		expect(pruned).toBe(1);
		expect(await taskRepo.count()).toBe(0);
	});
});
