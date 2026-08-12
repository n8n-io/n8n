import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { DataSource, ScheduledJobRepository, ScheduledTaskRepository } from '@n8n/db';
import { OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import type { RunInTransaction, Scheduler, TaskHandler } from '@n8n/scheduler';
import {
	createScheduler,
	pollLookaheadSeconds,
	DEFAULT_MATERIALIZER_OPTIONS,
} from '@n8n/scheduler';
import { InstanceSettings, Tracing } from 'n8n-core';

import { PrometheusSchedulerMetricsService } from '@/metrics/prometheus/scheduler-metrics.service';

import { PollTriggerTaskHandler } from './poll-trigger-node/poll-trigger-task-handler';
import { ScheduleTriggerTaskHandler } from './schedule-trigger-node/schedule-trigger-task-handler';
import { createSchedulerTracer } from './scheduler-tracer';

/**
 * The database-backed {@link Scheduler} and its process lifecycle (the run side).
 *
 * The loops run on every main: claiming makes concurrent instances safe, and
 * sharing the work across mains is the point of the durable scheduler.
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
		pollTriggerTaskHandler: PollTriggerTaskHandler,
		metrics: PrometheusSchedulerMetricsService,
	) {
		const config = globalConfig.scheduler;
		const enabled = config.enabled && instanceSettings.instanceType === 'main';
		const tracer = createSchedulerTracer(tracing);
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
						lookaheadSeconds: pollLookaheadSeconds(
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
						materializerIntervalSeconds: config.materializationIntervalSeconds,
						executorIntervalSeconds: config.executorIntervalSeconds,
						reaperIntervalSeconds: config.reaperIntervalSeconds,
						retentionIntervalSeconds: config.retentionIntervalSeconds,
						materializerTimeoutSeconds: config.materializationTimeoutSeconds,
						executorTimeoutSeconds: config.executorTimeoutSeconds,
						reaperTimeoutSeconds: config.reaperTimeoutSeconds,
						retentionTimeoutSeconds: config.retentionTimeoutSeconds,
						jitterRatio: config.jitterRatio,
						concurrencyMode:
							globalConfig.database.type === 'postgresdb' ? 'concurrent' : 'sequential',
						maxConcurrentPasses: config.maxConcurrentPasses,
					},
					now: async () => await tasks.readDbTime(),
					onEvent: ({ level, message, context }) => logger[level](message, context),
					tracer,
				})
			: undefined;
		if (enabled) {
			warnOnMisfireGrace(logger, config);
			warnOnDrainRate(logger, config);
		}
		this.registerTaskHandler(scheduleTriggerTaskHandler.taskType, scheduleTriggerTaskHandler);
		this.registerTaskHandler(pollTriggerTaskHandler.taskType, pollTriggerTaskHandler);
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

/** Warns when the configured grace window can't tolerate a normal restart or a short outage. */
function warnOnMisfireGrace(logger: Logger, config: GlobalConfig['scheduler']): void {
	const { misfireGraceSeconds, executorIntervalSeconds, materializationWindowSeconds } = config;
	if (misfireGraceSeconds <= executorIntervalSeconds) {
		logger.warn(
			'Scheduler misfire grace is at or below the executor interval; late runs may expire before they can be claimed',
			{ misfireGraceSeconds, executorIntervalSeconds },
		);
	}
	// A short outage (shorter than the window) doesn't create new unrecorded backlog
	// for the misfire policy to act on: the affected occurrences were already
	// recorded ahead of the outage, so they're retired once their grace passes
	// rather than coalesced.
	if (misfireGraceSeconds < materializationWindowSeconds) {
		logger.warn(
			'Scheduler misfire grace is below the materialization window; runs missed during a short outage are dropped rather than caught up',
			{ misfireGraceSeconds, materializationWindowSeconds },
		);
	}
}

/**
 * Warn when a materialization pass can't drain backlog as fast as the fastest
 * schedule on the instance can produce it. Under `coalesce`, a pass that always
 * hits `maxPerJob` before reaching the current occurrence never catches up: the
 * job's clock advances past a backlog it can never close, so it silently stops
 * running.
 */
function warnOnDrainRate(logger: Logger, config: GlobalConfig['scheduler']): void {
	const { materializationIntervalSeconds, minIntervalSeconds } = config;
	// The fastest a schedule can legally fire: the operator's floor if they set
	// one, otherwise the fastest an interval can be at all.
	const fastestIntervalSeconds = minIntervalSeconds > 0 ? minIntervalSeconds : 1;
	const drainSeconds = DEFAULT_MATERIALIZER_OPTIONS.maxPerJob * fastestIntervalSeconds;
	if (materializationIntervalSeconds > drainSeconds) {
		logger.warn(
			'Scheduler materialization interval is long enough that a pass may never fully drain the busiest possible schedule; under the coalesce misfire policy such a schedule could stop producing catch-up runs entirely',
			{ materializationIntervalSeconds, fastestIntervalSeconds },
		);
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
					claimDueJobs: async (limit, lookaheadMs) =>
						await jobs.claimDue(manager, limit, lookaheadMs),
					recordOccurrences: async (occurrences) =>
						await tasks.insertIgnoringDuplicates(manager, occurrences),
					retireSuperseded: async (superseded) => await tasks.updateToMissed(manager, superseded),
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
