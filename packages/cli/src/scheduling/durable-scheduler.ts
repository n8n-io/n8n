import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { DataSource, ScheduledJobRepository, ScheduledTaskRepository } from '@n8n/db';
import { OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import type { RunInTransaction, Scheduler, TaskHandler, Tracer } from '@n8n/scheduler';
import { createScheduler, executorLookaheadSeconds } from '@n8n/scheduler';
import { InstanceSettings, Tracing } from 'n8n-core';

import { PrometheusSchedulerMetricsService } from '@/metrics/prometheus/scheduler-metrics.service';

import { ScheduleTriggerTaskHandler } from './schedule-trigger-node/schedule-trigger-task-handler';

/**
 * The database-backed {@link Scheduler} and its process lifecycle.
 *
 * The loops run on every main: claiming makes concurrent instances safe,
 * and sharing the work across mains is the point of the durable scheduler.
 */
@Service()
export class DurableScheduler implements Scheduler {
	private readonly scheduler: Scheduler | undefined; // undefined means the scheduler is disabled

	constructor(
		private readonly logger: Logger,
		dataSource: DataSource,
		jobs: ScheduledJobRepository,
		tasks: ScheduledTaskRepository,
		instanceSettings: InstanceSettings,
		globalConfig: GlobalConfig,
		tracing: Tracing,
		scheduleTriggerTaskHandler: ScheduleTriggerTaskHandler,
		metrics: PrometheusSchedulerMetricsService,
	) {
		const config = globalConfig.scheduler;
		const enabled = config.enabled && instanceSettings.instanceType === 'main';
		const tracer: Tracer = {
			startSpan: async ({ newTrace, ...options }, run) =>
				await (newTrace === true
					? tracing.startNewTraceSpan(options, run)
					: tracing.startSpan(options, run)),
		};
		this.scheduler = enabled
			? createScheduler({
					hostId: instanceSettings.hostId,
					materializerTransaction: buildMaterializerTransaction(dataSource, jobs, tasks),
					taskStore: tasks,
					// The collector implements `SchedulerMetrics`; it stays a no-op sink
					// until its `init()` runs when metrics are enabled on a main instance.
					metrics,
					materializer: {
						windowSeconds: config.materializationWindowSeconds,
						defaultTimezone: globalConfig.generic.timezone,
					},
					executor: {
						leaseSeconds: config.leaseDurationSeconds,
						// Claim one executor tick ahead so a task due before the next tick still
						// fires on time; the horizon must cover the widest gap between two ticks.
						lookaheadSeconds: executorLookaheadSeconds(
							config.executorIntervalSeconds,
							config.jitterRatio,
						),
						batchSize: config.claimBatchSize,
					},
					reaper: { batchSize: config.reaperBatchSize },
					retention: {
						retentionSeconds: config.retentionSeconds,
						failedRetentionSeconds: config.failedRetentionSeconds,
					},
					lifecycle: {
						materializerIntervalSeconds: config.sweepIntervalSeconds,
						executorIntervalSeconds: config.executorIntervalSeconds,
						reaperIntervalSeconds: config.reaperIntervalSeconds,
						retentionIntervalSeconds: config.retentionIntervalSeconds,
						materializerTimeoutSeconds: config.sweepTimeoutSeconds,
						executorTimeoutSeconds: config.executorTimeoutSeconds,
						reaperTimeoutSeconds: config.reaperTimeoutSeconds,
						retentionTimeoutSeconds: config.retentionTimeoutSeconds,
						jitterRatio: config.jitterRatio,
						concurrencyMode:
							globalConfig.database.type === 'postgresdb' ? 'concurrent' : 'sequential',
						maxConcurrentPasses: config.maxConcurrentPasses,
					},
					onEvent: ({ level, message, context }) => logger[level](message, context),
					tracer,
				})
			: undefined;
		this.registerTaskHandler(scheduleTriggerTaskHandler.taskType, scheduleTriggerTaskHandler);
	}

	registerTaskHandler(taskType: string, handler: TaskHandler): void {
		if (this.scheduler === undefined) {
			this.logger.debug(
				'Durable scheduler is inactive on this instance; task handler not registered',
				{
					taskType,
				},
			);
			return;
		}
		this.scheduler.registerTaskHandler(taskType, handler);
	}

	start(): void {
		this.scheduler?.start();
	}

	@OnShutdown()
	async stop(): Promise<void> {
		await this.scheduler?.stop();
	}
}

export function buildMaterializerTransaction(
	dataSource: DataSource,
	jobs: ScheduledJobRepository,
	tasks: ScheduledTaskRepository,
): RunInTransaction {
	return async (work) =>
		await dataSource.transaction(
			async (manager) =>
				await work({
					claimDueJobs: async (limit) => await jobs.claimDue(manager, limit),
					recordOccurrences: async (occurrences) =>
						await tasks.insertIgnoringDuplicates(manager, occurrences),
					advanceJobs: async (planned) => {
						await jobs.advanceMany(
							manager,
							planned.map(({ job, plan }) => ({
								id: job.id,
								nextRunAt: plan.nextRunAt,
								lastFiredAt: plan.lastFiredAt,
							})),
						);
					},
				}),
		);
}
