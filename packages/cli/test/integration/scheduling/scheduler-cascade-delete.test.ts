import { testDb } from '@n8n/backend-test-utils';
import { DataSource, ScheduledJobRepository, ScheduledTaskRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { createScheduler } from '@n8n/scheduler';
import type { ClaimedTask, Scheduler, SchedulerPasses } from '@n8n/scheduler';

import { buildMaterializerTransaction } from '@/scheduling/durable-scheduler';

import { createDueJobFactory } from './shared/job-factory';

/**
 * Cascade-delete safety: a job's `scheduled_task` rows carry a real DB foreign
 * key with `ON DELETE CASCADE` (`FK_scheduled_task_jobId`, see
 * `CreateSchedulerTables`), so deleting a job while one of its occurrences is
 * claimed removes the claimed row out from under its owner. Every guarded
 * write and pass must treat that as benign, never throw.
 *
 * The claimed row is seeded directly (as the multi-main suite's stranded-lease
 * test does) rather than raced against the executor's real fire timer: that
 * keeps the scenario deterministic while still exercising the real cascade.
 */
describe('scheduler cascade-delete safety', () => {
	const TASK_TYPE = 'integration-cascade-delete-test';
	const HOST = 'main-cascade-test';

	let jobRepo: ScheduledJobRepository;
	let taskRepo: ScheduledTaskRepository;
	let scheduler: Scheduler & SchedulerPasses;
	let createJob: ReturnType<typeof createDueJobFactory>;
	const executed: ClaimedTask[] = [];

	beforeAll(async () => {
		await testDb.init();
		jobRepo = Container.get(ScheduledJobRepository);
		taskRepo = Container.get(ScheduledTaskRepository);
		createJob = createDueJobFactory(jobRepo, TASK_TYPE, 'job-cascade');
		scheduler = createScheduler({
			hostId: HOST,
			materializerTransaction: buildMaterializerTransaction(
				Container.get(DataSource),
				jobRepo,
				taskRepo,
			),
			taskStore: taskRepo,
		});
		scheduler.registerTaskHandler(TASK_TYPE, {
			execute: async (task) => {
				executed.push(task);
			},
		});
	});

	beforeEach(async () => {
		executed.length = 0;
		await testDb.truncate(['ScheduledTask', 'ScheduledJob']);
	});

	afterAll(async () => {
		await scheduler.stop();
		await testDb.terminate();
	});

	it('cascades a claimed task away with its job, leaving its terminal write a benign no-op', async () => {
		const job = await createJob();
		const past = new Date(Date.now() - 1000);
		const claimed = await taskRepo.save(
			taskRepo.create({
				jobId: job.id,
				taskType: TASK_TYPE,
				payload: {},
				scheduledFor: past,
				runAt: past,
				status: 'running',
				claimedBy: HOST,
				leaseExpiresAt: new Date(Date.now() + 30_000),
				leaseEpoch: 1,
				attempts: 1,
				maxAttempts: 3,
			}),
		);

		// The real FK cascade: deleting the parent job removes its claimed task
		// row, mid-lease, out from under its owner.
		await jobRepo.delete({ id: job.id });

		const gone = await taskRepo.findOneBy({ id: claimed.id });
		expect(gone).toBeNull();

		// The claim's owner tries to record its outcome after the row is gone.
		// The guard matches no row rather than throwing.
		const staleComplete = await taskRepo.completeTask({
			id: claimed.id,
			host: HOST,
			claimedEpoch: 1,
		});
		expect(staleComplete).toBe(0);

		// The now-empty table gives every other pass nothing to do, not an error.
		expect(await scheduler.reap()).toEqual({ reclaimed: 0, deadLettered: 0 });
		expect(await scheduler.execute()).toEqual([]);
		expect(executed).toHaveLength(0);
	});

	it('cascades pending, unclaimed tasks away too, and a reap sweep over the empty table is a no-op', async () => {
		const job = await createJob();
		const past = new Date(Date.now() - 1000);
		await taskRepo.save(
			taskRepo.create({
				jobId: job.id,
				taskType: TASK_TYPE,
				payload: {},
				scheduledFor: past,
				runAt: past,
				status: 'pending',
				maxAttempts: 3,
			}),
		);

		await jobRepo.delete({ id: job.id });

		expect(await taskRepo.countBy({ jobId: job.id })).toBe(0);
		expect(await scheduler.reap()).toEqual({ reclaimed: 0, deadLettered: 0 });
		expect(await scheduler.execute()).toEqual([]);
	});
});
