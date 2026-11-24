import { testDb } from '@n8n/backend-test-utils';
import { DataSource, ScheduledJobRepository, ScheduledTaskRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { createScheduler } from '@n8n/scheduler';
import type { Scheduler, SchedulerPasses } from '@n8n/scheduler';

import { buildMaterializerTransaction } from '@/scheduling/durable-scheduler';

import { selfOwned } from './shared/job-factory';

/**
 * A handler that runs longer than its lease keeps its claim: the executor's
 * heartbeat renews the lease, so the reaper never hands the occurrence to
 * another run while the first one still works.
 */
describe('scheduler lease renewal over the storage bindings', () => {
	const TASK_TYPE = 'integration-lease-renewal-test';
	// Allow seven seconds for the first renewal, which starts after five seconds.
	const LEASE_SECONDS = 12;
	const RUN_MS = 15_000;

	let jobRepo: ScheduledJobRepository;
	let taskRepo: ScheduledTaskRepository;
	let scheduler: Scheduler & SchedulerPasses;
	let runs = 0;

	beforeAll(async () => {
		await testDb.init();
		jobRepo = Container.get(ScheduledJobRepository);
		taskRepo = Container.get(ScheduledTaskRepository);
		scheduler = createScheduler({
			hostId: 'main-lease-renewal-test',
			materializerTransaction: buildMaterializerTransaction(
				Container.get(DataSource),
				jobRepo,
				taskRepo,
			),
			taskStore: taskRepo,
			executor: { leaseSeconds: LEASE_SECONDS, lookaheadSeconds: 1 },
		});
		scheduler.registerTaskHandler(TASK_TYPE, {
			execute: async (_task, report) => {
				runs += 1;
				await new Promise((resolve) => setTimeout(resolve, RUN_MS));
				return report.notDispatched();
			},
		});
	});

	afterAll(async () => {
		await scheduler.stop();
		await testDb.terminate();
	});

	it('keeps the claim of a handler that runs longer than its lease', async () => {
		const job = await jobRepo.save(
			jobRepo.create({
				name: 'job-lease-renewal',
				...selfOwned('job-lease-renewal'),
				taskType: TASK_TYPE,
				payload: {},
				kind: 'interval',
				intervalSeconds: 3600,
				enabled: true,
				nextRunAt: new Date(Date.now() - 1000),
				maxAttempts: 3,
			}),
		);
		await scheduler.materialize();
		expect(await scheduler.execute()).toHaveLength(1);

		// Sweep like a busy reaper for the whole run: every sweep sees a live lease.
		const reclaimed: number[] = [];
		const deadline = Date.now() + RUN_MS + 5_000;
		let task = await taskRepo.findOneByOrFail({ jobId: job.id });
		while (task.status === 'running' && Date.now() < deadline) {
			const { reclaimed: count, deadLettered } = await scheduler.reap();
			reclaimed.push(count + deadLettered);
			await new Promise((resolve) => setTimeout(resolve, 200));
			task = await taskRepo.findOneByOrFail({ jobId: job.id });
		}

		expect(reclaimed.every((count) => count === 0)).toBe(true);
		expect(task.status).toBe('succeeded');
		expect(task.attempts).toBe(0);
		expect(task.leaseEpoch).toBe(1);
		expect(runs).toBe(1);
	}, 30_000);
});
