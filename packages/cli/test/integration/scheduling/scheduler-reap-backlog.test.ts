import { testDb } from '@n8n/backend-test-utils';
import { DataSource, ScheduledJobRepository, ScheduledTaskRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { createScheduler } from '@n8n/scheduler';
import type { Scheduler, SchedulerMetrics, SchedulerPasses } from '@n8n/scheduler';
import { mock } from 'vitest-mock-extended';

import { buildMaterializerTransaction } from '@/scheduling/durable-scheduler';

import { selfOwned } from './shared/job-factory';

/**
 * Occurrences nobody claimed before their deadline can pile up faster than one
 * retire batch clears them. One sweep must clear such a backlog, so that it does
 * not stay `pending` and slow down every claim.
 */
describe('scheduler reaper with a backlog of stale occurrences', () => {
	const TASK_TYPE = 'integration-reap-backlog-test';
	const BATCH_SIZE = 100;
	const STALE_COUNT = BATCH_SIZE * 2 + 50;

	let jobRepo: ScheduledJobRepository;
	let taskRepo: ScheduledTaskRepository;
	let scheduler: Scheduler & SchedulerPasses;

	beforeAll(async () => {
		await testDb.init();
		jobRepo = Container.get(ScheduledJobRepository);
		taskRepo = Container.get(ScheduledTaskRepository);
		scheduler = createScheduler({
			hostId: 'main-reap-backlog-test',
			materializerTransaction: buildMaterializerTransaction(
				Container.get(DataSource),
				jobRepo,
				taskRepo,
			),
			taskStore: taskRepo,
			reaper: { batchSize: BATCH_SIZE },
			metrics: mock<SchedulerMetrics>(),
		});
	});

	afterAll(async () => {
		await scheduler.stop();
		await testDb.terminate();
	});

	it('retires the whole backlog in one sweep and keeps live occurrences claimable', async () => {
		const job = await jobRepo.save(
			jobRepo.create({
				name: 'job-reap-backlog',
				...selfOwned('job-reap-backlog'),
				taskType: TASK_TYPE,
				payload: {},
				kind: 'interval',
				intervalSeconds: 60,
				enabled: true,
				nextRunAt: new Date(Date.now() + 3_600_000),
				maxAttempts: 1,
			}),
		);
		const base = Date.parse('2026-06-01T00:00:00.000Z');
		const task = (i: number, missedAfter: Date) =>
			taskRepo.create({
				jobId: job.id,
				taskType: TASK_TYPE,
				payload: {},
				scheduledFor: new Date(base + i * 1000),
				runAt: new Date(Date.now() - 120_000),
				missedAfter,
				status: 'pending',
				attempts: 0,
				maxAttempts: 1,
			});
		const stale = Array.from({ length: STALE_COUNT }, (_, i) =>
			task(i, new Date(Date.now() - 60_000)),
		);
		await taskRepo.save(stale, { chunk: 50 });
		const live = await taskRepo.save(task(STALE_COUNT, new Date(Date.now() + 60_000)));

		const { missed } = await scheduler.reap();

		expect(missed).toBe(STALE_COUNT);
		expect(await taskRepo.countBy({ status: 'pending' })).toBe(1);
		const claimed = await taskRepo.claimDueTasks({
			host: 'main-reap-backlog-test',
			taskTypes: [TASK_TYPE],
			lookaheadMs: 0,
			leaseMs: 60_000,
			batchSize: 10,
		});
		expect(claimed.map((t) => t.id)).toEqual([live.id]);
	});
});
