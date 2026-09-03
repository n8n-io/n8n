import { mockLogger } from '@n8n/backend-test-utils';
import type { GlobalConfig } from '@n8n/config';
import { ScheduledJobOwnerType } from '@n8n/constants';
import type { DataSource, ScheduledJobRepository, ScheduledTaskRepository } from '@n8n/db';
import type { Scheduler, SchedulerPasses } from '@n8n/scheduler';
import { createScheduler } from '@n8n/scheduler';
import type { InstanceSettings, Tracing } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { PrometheusSchedulerMetricsService } from '@/metrics/prometheus/scheduler-metrics.service';

import { DurableScheduler } from '../durable-scheduler';
import { POLL_TRIGGER_TASK_TYPE } from '../poll-trigger-node/poll-trigger-task';
import type { PollTriggerTaskHandler } from '../poll-trigger-node/poll-trigger-task-handler';
import { SCHEDULE_TRIGGER_TASK_TYPE } from '../schedule-trigger-node/schedule-trigger-task';
import type { ScheduleTriggerTaskHandler } from '../schedule-trigger-node/schedule-trigger-task-handler';
import type { WorkflowScheduledJobOwner } from '../workflow-scheduled-job-owner';

// Keep the real exports (e.g. pollLookaheadSeconds) so the wiring is tested
// against the actual formula; only the scheduler factory is stubbed.
vi.mock('@n8n/scheduler', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/scheduler')>()),
	createScheduler: vi.fn(),
}));

describe('DurableScheduler', () => {
	function makeScheduler({
		enabled = true,
		instanceType = 'main',
		dbType = 'sqlite',
		materializationIntervalSeconds = 10,
		minIntervalSeconds = 0,
		executorIntervalSeconds = 5,
		materializationWindowSeconds = 60,
		misfireGraceSeconds = 60,
		enabledForPollTriggers = false,
		pollTimeoutSeconds = 45,
		leaseDurationSeconds = 60,
		useWorkflowPublicationService = true,
		ownerReconciliationEnabled = true,
	} = {}) {
		const inner = mock<Scheduler & SchedulerPasses>();
		vi.mocked(createScheduler).mockReturnValue(inner);
		const logger = mockLogger();
		const scheduleTriggerTaskHandler = mock<ScheduleTriggerTaskHandler>({
			taskType: SCHEDULE_TRIGGER_TASK_TYPE,
		});
		const pollTriggerTaskHandler = mock<PollTriggerTaskHandler>({
			taskType: POLL_TRIGGER_TASK_TYPE,
		});
		const tracing = mock<Tracing>();
		const tasks = mock<ScheduledTaskRepository>();
		tasks.readDbTime.mockResolvedValue(new Date());
		const workflowOwner = mock<WorkflowScheduledJobOwner>();
		const scheduler = new DurableScheduler(
			logger,
			mock<DataSource>(),
			mock<ScheduledJobRepository>(),
			tasks,
			mock<InstanceSettings>({ instanceType: instanceType as 'main' | 'worker' | 'webhook' }),
			mock<GlobalConfig>({
				generic: { timezone: 'UTC' },
				database: { type: dbType as 'sqlite' | 'postgresdb' },
				scheduler: {
					enabled,
					executorIntervalSeconds,
					jitterRatio: 0.1,
					materializationIntervalSeconds,
					minIntervalSeconds,
					materializationWindowSeconds,
					misfireGraceSeconds,
					enabledForPollTriggers,
					pollTimeoutSeconds,
					leaseDurationSeconds,
					ownerReconciliationEnabled,
					ownerReconciliationIntervalSeconds: 900,
					ownerReconciliationTimeoutSeconds: 300,
					ownerReconciliationBatchSize: 500,
					ownerQuarantineGraceSeconds: 86_400,
					ownerSettleSeconds: 300,
				},
				workflows: { useWorkflowPublicationService },
			}),
			tracing,
			scheduleTriggerTaskHandler,
			pollTriggerTaskHandler,
			mock<PrometheusSchedulerMetricsService>(),
			workflowOwner,
		);
		return { scheduler, inner, logger, tracing, tasks, workflowOwner };
	}

	describe('composition', () => {
		it('widens the executor lookahead by the full symmetric jitter span', () => {
			makeScheduler();

			// Consecutive executor ticks can be up to interval·(1+2·jitter) apart (one early,
			// the next late), so the claim horizon must cover the whole span or a task due in
			// the tail fires late. Defaults 5s · (1 + 2·0.1) = 6.
			const deps = vi.mocked(createScheduler).mock.calls.at(-1)?.[0];
			expect(deps?.executor?.lookaheadSeconds).toBeCloseTo(6.0);
		});

		it('runs passes concurrently on Postgres, which claims with row locks', () => {
			makeScheduler({ dbType: 'postgresdb' });

			const deps = vi.mocked(createScheduler).mock.calls.at(-1)?.[0];
			expect(deps?.lifecycle?.concurrencyMode).toBe('concurrent');
		});

		it('runs passes sequentially on SQLite, which serialises writers', () => {
			makeScheduler({ dbType: 'sqlite' });

			const deps = vi.mocked(createScheduler).mock.calls.at(-1)?.[0];
			expect(deps?.lifecycle?.concurrencyMode).toBe('sequential');
		});
	});

	describe('drain rate warning', () => {
		it('warns when a pass cannot drain the fastest possible schedule before the next one is due', () => {
			// maxPerJob is 1000: a schedule as fast as this instance allows (the default
			// floor of one second) can outrun a 1001s materialization interval.
			const { logger } = makeScheduler({ materializationIntervalSeconds: 1001 });

			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('materialization interval'),
				expect.objectContaining({ materializationIntervalSeconds: 1001 }),
			);
		});

		it('does not warn at the default materialization interval', () => {
			const { logger } = makeScheduler();

			expect(logger.warn).not.toHaveBeenCalledWith(
				expect.stringContaining('materialization interval'),
				expect.anything(),
			);
		});

		it('scales the threshold by an operator-configured minimum interval floor', () => {
			// A 60s floor makes 1001s safe again: even the fastest schedule now
			// produces at most one occurrence per 60s, well within maxPerJob's reach.
			const { logger } = makeScheduler({
				materializationIntervalSeconds: 1001,
				minIntervalSeconds: 60,
			});

			expect(logger.warn).not.toHaveBeenCalledWith(
				expect.stringContaining('materialization interval'),
				expect.anything(),
			);
		});
	});

	describe('misfire grace warning', () => {
		it('warns when the grace is at or below the executor interval', () => {
			const { logger } = makeScheduler({ misfireGraceSeconds: 5, executorIntervalSeconds: 5 });

			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('executor interval'),
				expect.objectContaining({ misfireGraceSeconds: 5, executorIntervalSeconds: 5 }),
			);
		});

		it('warns when the grace is below the materialization window', () => {
			const { logger } = makeScheduler({
				misfireGraceSeconds: 30,
				materializationWindowSeconds: 60,
			});

			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('materialization window'),
				expect.objectContaining({ misfireGraceSeconds: 30, materializationWindowSeconds: 60 }),
			);
		});

		it('does not warn at the default grace', () => {
			const { logger } = makeScheduler();

			expect(logger.warn).not.toHaveBeenCalledWith(
				expect.stringContaining('misfire grace'),
				expect.anything(),
			);
		});
	});

	describe('poll timeout warning', () => {
		it('warns when a poll may outlive the lease on its occurrence', () => {
			const { logger } = makeScheduler({
				enabledForPollTriggers: true,
				pollTimeoutSeconds: 120,
				leaseDurationSeconds: 60,
			});

			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('poll timeout'),
				expect.objectContaining({ pollTimeoutSeconds: 120, leaseDurationSeconds: 60 }),
			);
		});

		// The poll deadline starts after the occurrence's setup reads, so a timeout
		// equal to the lease already lets a full-length poll outlive it.
		it('warns when the timeout equals the lease', () => {
			const { logger } = makeScheduler({
				enabledForPollTriggers: true,
				pollTimeoutSeconds: 60,
				leaseDurationSeconds: 60,
			});

			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('poll timeout'),
				expect.objectContaining({ pollTimeoutSeconds: 60, leaseDurationSeconds: 60 }),
			);
		});

		it('does not warn when the timeout fits inside the lease', () => {
			const { logger } = makeScheduler({
				enabledForPollTriggers: true,
				pollTimeoutSeconds: 45,
				leaseDurationSeconds: 60,
			});

			expect(logger.warn).not.toHaveBeenCalledWith(
				expect.stringContaining('poll timeout'),
				expect.anything(),
			);
		});

		it('does not warn when poll triggers do not use the durable scheduler', () => {
			const { logger } = makeScheduler({
				enabledForPollTriggers: false,
				pollTimeoutSeconds: 120,
				leaseDurationSeconds: 60,
			});

			expect(logger.warn).not.toHaveBeenCalledWith(
				expect.stringContaining('poll timeout'),
				expect.anything(),
			);
		});

		// Without the publication service the durable poller chain is inactive and
		// polls run on the legacy in-memory path, where the timeout does not apply.
		it('does not warn when the workflow publication service is disabled', () => {
			const { logger } = makeScheduler({
				enabledForPollTriggers: true,
				pollTimeoutSeconds: 120,
				leaseDurationSeconds: 60,
				useWorkflowPublicationService: false,
			});

			expect(logger.warn).not.toHaveBeenCalledWith(
				expect.stringContaining('poll timeout'),
				expect.anything(),
			);
		});
	});

	describe('tracer', () => {
		// A fire span is opened from inside a timer callback armed while the claim
		// span was active, so it needs a fresh trace instead of parenting under a
		// (possibly already-closed) claim span; every other span parents normally.
		it('routes a newTrace span through startNewTraceSpan, stripping the flag', async () => {
			const { tracing } = makeScheduler();
			const deps = vi.mocked(createScheduler).mock.calls.at(-1)?.[0];
			const run = vi.fn();

			await deps?.tracer?.startSpan({ name: 'Scheduler fire', newTrace: true }, run);

			expect(tracing.startNewTraceSpan).toHaveBeenCalledWith({ name: 'Scheduler fire' }, run);
			expect(tracing.startSpan).not.toHaveBeenCalled();
		});

		it('routes a plain span through startSpan', async () => {
			const { tracing } = makeScheduler();
			const deps = vi.mocked(createScheduler).mock.calls.at(-1)?.[0];
			const run = vi.fn();

			await deps?.tracer?.startSpan({ name: 'Scheduler materialize' }, run);

			expect(tracing.startSpan).toHaveBeenCalledWith({ name: 'Scheduler materialize' }, run);
			expect(tracing.startNewTraceSpan).not.toHaveBeenCalled();
		});
	});

	describe('isActive', () => {
		it('is true on a main when the scheduler is enabled', () => {
			const { scheduler } = makeScheduler({ enabled: true, instanceType: 'main' });

			expect(scheduler.isActive()).toBe(true);
		});

		it.each([
			{ case: 'the scheduler is disabled', enabled: false, instanceType: 'main' },
			{ case: 'the instance is not a main', enabled: true, instanceType: 'webhook' },
		])('is false when $case', ({ enabled, instanceType }) => {
			const { scheduler } = makeScheduler({ enabled, instanceType });

			expect(scheduler.isActive()).toBe(false);
		});
	});

	describe('registerTaskHandler', () => {
		it('delegates to the inner scheduler when active', () => {
			const { scheduler, inner } = makeScheduler();
			const handler = { execute: vi.fn() };

			scheduler.registerTaskHandler('some-task', handler);

			expect(inner.registerTaskHandler).toHaveBeenCalledWith('some-task', handler);
		});

		it('registers the schedule- and poll-trigger handlers at construction', () => {
			const { inner } = makeScheduler();

			expect(inner.registerTaskHandler).toHaveBeenCalledWith(
				SCHEDULE_TRIGGER_TASK_TYPE,
				expect.objectContaining({ taskType: SCHEDULE_TRIGGER_TASK_TYPE }),
			);
			expect(inner.registerTaskHandler).toHaveBeenCalledWith(
				POLL_TRIGGER_TASK_TYPE,
				expect.objectContaining({ taskType: POLL_TRIGGER_TASK_TYPE }),
			);
		});
	});

	describe('owner registration', () => {
		it('composes the reconciliation pass over a registry declaring the workflow owner', () => {
			const { workflowOwner } = makeScheduler();

			const deps = vi.mocked(createScheduler).mock.calls.at(-1)?.[0];
			expect(deps?.reconciliation?.owners.resolverFor(ScheduledJobOwnerType.Workflow)).toBe(
				workflowOwner,
			);
			expect(deps?.reconciliation?.options).toMatchObject({
				settleSeconds: 300,
				quarantineGraceSeconds: 86_400,
				batchSize: 500,
			});
		});

		it('composes no reconciliation pass when it is disabled', () => {
			makeScheduler({ ownerReconciliationEnabled: false });

			const deps = vi.mocked(createScheduler).mock.calls.at(-1)?.[0];
			expect(deps?.reconciliation).toBeUndefined();
		});
	});

	describe('start', () => {
		it('starts the loops on a main when the scheduler is enabled', () => {
			const { scheduler, inner } = makeScheduler();

			scheduler.start();

			expect(inner.start).toHaveBeenCalledTimes(1);
		});

		it('does not start when the scheduler is disabled', () => {
			const { scheduler, inner } = makeScheduler({ enabled: false });

			scheduler.start();

			expect(inner.start).not.toHaveBeenCalled();
		});

		it('does not start on a non-main instance', () => {
			const { scheduler, inner } = makeScheduler({ instanceType: 'worker' });

			scheduler.start();

			expect(inner.start).not.toHaveBeenCalled();
		});

		// The skew detection itself lives in the scheduler package (behind the event
		// sink); the host only supplies the clock read, which here is the database.
		it('wires the coordination clock reader to the repository', async () => {
			const { tasks } = makeScheduler();
			const deps = vi.mocked(createScheduler).mock.calls.at(-1)?.[0];

			await deps?.now?.();

			expect(tasks.readDbTime).toHaveBeenCalledTimes(1);
		});
	});

	describe('stop', () => {
		it('stops a started scheduler', async () => {
			const { scheduler, inner } = makeScheduler();
			scheduler.start();

			await scheduler.stop();

			expect(inner.stop).toHaveBeenCalledTimes(1);
		});

		it('does not stop a scheduler that never started', async () => {
			const { scheduler, inner } = makeScheduler({ enabled: false });
			scheduler.start();

			await scheduler.stop();

			expect(inner.stop).not.toHaveBeenCalled();
		});
	});
});
