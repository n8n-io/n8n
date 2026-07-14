import { Logger } from '@n8n/backend-common';
import { testDb } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { DataSource, ScheduledJobRepository, ScheduledTaskRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { ClaimedTask } from '@n8n/scheduler';
import type { InstanceSettings } from 'n8n-core';
import { Tracing } from 'n8n-core';

import { PrometheusSchedulerMetricsService } from '@/metrics/prometheus/scheduler-metrics.service';
import { DurableScheduler } from '@/scheduling/durable-scheduler';
import { ScheduleTriggerTaskHandler } from '@/scheduling/schedule-trigger-node/schedule-trigger-task-handler';

import { retryUntil } from '../shared/retry-until';
import { createDueJobFactory, seedDueTask } from './shared/job-factory';

/**
 * The process lifecycle wired in `start.ts`: `DurableScheduler.start()` driving
 * the real DB-backed loops on a main, and the feature-flag gate that keeps them
 * off everywhere else. The unit suite exercises the gate with `createScheduler`
 * mocked; this drives the real loops against a real database and asserts the
 * gate by whether a seeded occurrence is picked up at all.
 */
describe('durable scheduler process lifecycle and flag gating', () => {
	const TASK_TYPE = 'integration-lifecycle-test';

	let jobRepo: ScheduledJobRepository;
	let taskRepo: ScheduledTaskRepository;
	let scheduler: DurableScheduler | undefined;
	let createDueJob: ReturnType<typeof createDueJobFactory>;
	const executed: ClaimedTask[] = [];

	beforeAll(async () => {
		await testDb.init();
		jobRepo = Container.get(ScheduledJobRepository);
		taskRepo = Container.get(ScheduledTaskRepository);
		createDueJob = createDueJobFactory(jobRepo, TASK_TYPE, 'lifecycle-job');
	});

	beforeEach(async () => {
		executed.length = 0;
		await testDb.truncate(['ScheduledTask', 'ScheduledJob']);
	});

	afterEach(async () => {
		await scheduler?.stop();
		scheduler = undefined;
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	// Push intervals down to a second so the loops act within the test window.
	const buildScheduler = (opts: { enabled: boolean; instanceType?: 'main' | 'worker' }) => {
		const globalConfig = Container.get(GlobalConfig);
		globalConfig.scheduler.enabled = opts.enabled;
		globalConfig.scheduler.sweepIntervalSeconds = 1;
		globalConfig.scheduler.executorIntervalSeconds = 1;
		globalConfig.scheduler.reaperIntervalSeconds = 1;
		globalConfig.scheduler.retentionIntervalSeconds = 1;

		const instanceSettings = {
			instanceType: opts.instanceType ?? 'main',
			hostId: 'lifecycle-host',
		} as InstanceSettings;

		return new DurableScheduler(
			Container.get(Logger),
			Container.get(DataSource),
			jobRepo,
			taskRepo,
			instanceSettings,
			globalConfig,
			Container.get(Tracing),
			// The auto-registered schedule-trigger handler is harmless here: no
			// schedule-trigger occurrences are seeded, so it never fires.
			Container.get(ScheduleTriggerTaskHandler),
			Container.get(PrometheusSchedulerMetricsService),
		);
	};

	it('runs the loops on a main and fires a due job end to end', async () => {
		scheduler = buildScheduler({ enabled: true });
		scheduler.registerTaskHandler(TASK_TYPE, {
			execute: async (task) => {
				executed.push(task);
			},
		});

		const job = await createDueJob();
		scheduler.start();

		// The materialize loop turns the due job into an occurrence and the executor
		// loop claims and fires it; both run without any manual pass invocation.
		await retryUntil(
			async () => {
				const task = await taskRepo.findOneBy({ jobId: job.id });
				expect(task?.status).toBe('succeeded');
			},
			{ intervalMs: 100, timeoutMs: 20_000 },
		);
		expect(executed).toHaveLength(1);
	}, 30_000);

	it('does nothing when the flag is off, leaving occurrences untouched', async () => {
		scheduler = buildScheduler({ enabled: false });
		scheduler.registerTaskHandler(TASK_TYPE, {
			execute: async (task) => {
				executed.push(task);
			},
		});

		const job = await createDueJob();
		await seedDueTask(taskRepo, TASK_TYPE, job.id);
		scheduler.start();

		// No positive event to await: give the loops time to (wrongly) run, then
		// assert the occurrence was never claimed.
		await new Promise((resolve) => setTimeout(resolve, 3000));

		const task = await taskRepo.findOneByOrFail({ jobId: job.id });
		expect(task.status).toBe('pending');
		expect(task.claimedBy).toBeNull();
		expect(executed).toHaveLength(0);
	}, 15_000);

	it('stays disabled on a worker even with the flag on', async () => {
		scheduler = buildScheduler({ enabled: true, instanceType: 'worker' });
		scheduler.registerTaskHandler(TASK_TYPE, {
			execute: async (task) => {
				executed.push(task);
			},
		});

		const job = await createDueJob();
		await seedDueTask(taskRepo, TASK_TYPE, job.id);
		scheduler.start();

		await new Promise((resolve) => setTimeout(resolve, 3000));

		const task = await taskRepo.findOneByOrFail({ jobId: job.id });
		expect(task.status).toBe('pending');
		expect(executed).toHaveLength(0);
	}, 15_000);
});
