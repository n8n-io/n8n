import { testDb } from '@n8n/backend-test-utils';
import { DataSource, ScheduledJobRepository, ScheduledTaskRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { createScheduler } from '@n8n/scheduler';
import type { Scheduler, SchedulerMetrics, SchedulerPasses } from '@n8n/scheduler';
import { mock } from 'vitest-mock-extended';

import { buildMaterializerTransaction } from '@/scheduling/durable-scheduler';

import { selfOwned } from './shared/job-factory';

/**
 * A handler that never settles and ignores its signal stops holding its claim
 * once it reaches its timeout: the executor stops renewing the lease, so the
 * reaper recovers the occurrence within one lease after the timeout.
 */
describe('scheduler task timeout over the storage bindings', () => {
	const TASK_TYPE = 'integration-task-timeout-test';
	// The first renewal lands after five seconds, before the timeout, so the lease
	// outlives its first term only through the heartbeat.
	const LEASE_SECONDS = 6;
	const TIMEOUT_SECONDS = 7;

	let jobRepo: ScheduledJobRepository;
	let taskRepo: ScheduledTaskRepository;
	let scheduler: Scheduler & SchedulerPasses;
	const metrics = mock<SchedulerMetrics>();
	let signal: AbortSignal | undefined;

	beforeAll(async () => {
		await testDb.init();
		jobRepo = Container.get(ScheduledJobRepository);
		taskRepo = Container.get(ScheduledTaskRepository);
		scheduler = createScheduler({
			hostId: 'main-task-timeout-test',
			materializerTransaction: buildMaterializerTransaction(
				Container.get(DataSource),
				jobRepo,
				taskRepo,
			),
			taskStore: taskRepo,
			executor: { leaseSeconds: LEASE_SECONDS, lookaheadSeconds: 1 },
			metrics,
		});
		scheduler.registerTaskHandler(TASK_TYPE, {
			execute: async (_task, _report, s) => {
				signal = s;
				return await new Promise<never>(() => {});
			},
		});
	});

	afterAll(async () => {
		await scheduler.stop();
		await testDb.terminate();
	});

	it('recovers a handler that never settles after its timeout plus one lease', async () => {
		const job = await jobRepo.save(
			jobRepo.create({
				name: 'job-task-timeout',
				...selfOwned('job-task-timeout'),
				taskType: TASK_TYPE,
				payload: {},
				kind: 'interval',
				intervalSeconds: 3600,
				enabled: true,
				nextRunAt: new Date(Date.now() - 1000),
				maxAttempts: 3,
				timeoutSeconds: TIMEOUT_SECONDS,
			}),
		);
		await scheduler.materialize();
		const [claimed] = await scheduler.execute();
		expect(claimed.timeoutSeconds).toBe(TIMEOUT_SECONDS);
		const dispatchedAt = Date.now();

		// Sweep like a busy reaper until the occurrence comes back.
		const deadline = dispatchedAt + (TIMEOUT_SECONDS + LEASE_SECONDS + 5) * 1_000;
		let reclaimedAt: number | undefined;
		while (reclaimedAt === undefined && Date.now() < deadline) {
			const { reclaimed } = await scheduler.reap();
			if (reclaimed > 0) {
				reclaimedAt = Date.now();
			} else {
				await new Promise((resolve) => setTimeout(resolve, 200));
			}
		}

		expect(reclaimedAt).toBeDefined();
		const elapsedMs = reclaimedAt! - dispatchedAt;
		expect(elapsedMs).toBeGreaterThanOrEqual(TIMEOUT_SECONDS * 1_000);
		expect(elapsedMs).toBeLessThanOrEqual((TIMEOUT_SECONDS + LEASE_SECONDS + 1) * 1_000);
		expect(signal?.reason).toMatchObject({
			name: 'TaskTimeoutError',
			timeoutSeconds: TIMEOUT_SECONDS,
		});
		expect(metrics.recordTaskTimeout).toHaveBeenCalledExactlyOnceWith(TASK_TYPE);

		const task = await taskRepo.findOneByOrFail({ jobId: job.id });
		expect(task.status).toBe('pending');
		expect(task.attempts).toBe(1);
	}, 30_000);
});
