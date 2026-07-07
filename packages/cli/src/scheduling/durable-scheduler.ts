import { Logger } from '@n8n/backend-common';
import { GlobalConfig, SchedulerConfig } from '@n8n/config';
import { DataSource, ScheduledJobRepository, ScheduledTaskRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { createScheduler } from '@n8n/scheduler';
import type {
	ClaimedTask,
	MaterializerSummary,
	ReapResult,
	RetentionSummary,
	RunInTransaction,
	Scheduler,
	TaskHandler,
	Tracer,
} from '@n8n/scheduler';
import { InstanceSettings, Tracing } from 'n8n-core';

/**
 * The database-backed {@link Scheduler}: binds `createScheduler` to this
 * instance's repositories, config, host identity and logger. The repositories
 * satisfy the core store contracts structurally, so no adapters sit between
 * them. Lifecycle wiring drives each pass on its own configured cadence; this
 * service does not schedule itself.
 */
@Service()
export class DurableScheduler implements Scheduler {
	readonly materializerTransaction: RunInTransaction = async (work) =>
		await this.dataSource.transaction(
			async (manager) =>
				await work({
					claimDueJobs: async (limit) => await this.jobs.claimDue(manager, limit),
					recordOccurrences: async (occurrences) =>
						await this.tasks.insertIgnoringDuplicates(manager, occurrences),
					advanceJobs: async (planned) => {
						await this.jobs.advanceMany(
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

	private readonly scheduler: Scheduler;

	constructor(
		private readonly dataSource: DataSource,
		private readonly jobs: ScheduledJobRepository,
		private readonly tasks: ScheduledTaskRepository,
		private readonly logger: Logger,
		instanceSettings: InstanceSettings,
		config: SchedulerConfig,
		globalConfig: GlobalConfig,
		tracing: Tracing,
	) {
		// Pass-through adapter: bridges the scheduler's dependency-light tracer port
		// to n8n-core's concrete (Sentry-backed) Tracing service.
		const tracer: Tracer = {
			startSpan: async (options, run) => await tracing.startSpan(options, run),
		};

		this.scheduler = createScheduler({
			hostId: instanceSettings.hostId,
			materializerTransaction: this.materializerTransaction,
			taskStore: tasks,
			materializer: {
				windowSeconds: config.materializationWindowSeconds,
				defaultTimezone: globalConfig.generic.timezone,
			},
			executor: {
				leaseSeconds: config.leaseDurationSeconds,
				// Claim one executor tick ahead so a task due before the next tick still fires on time.
				lookaheadSeconds: config.executorIntervalSeconds,
				batchSize: config.claimBatchSize,
			},
			reaper: { batchSize: config.reaperBatchSize },
			retention: {
				retentionSeconds: config.retentionSeconds,
				failedRetentionSeconds: config.failedRetentionSeconds,
			},
			onEvent: ({ level, message, context }) => this.logger[level](message, context),
			tracer,
		});
	}

	registerTaskHandler(taskType: string, handler: TaskHandler): void {
		this.scheduler.registerTaskHandler(taskType, handler);
	}

	async materialize(): Promise<MaterializerSummary> {
		return await this.scheduler.materialize();
	}

	async execute(): Promise<ClaimedTask[]> {
		return await this.scheduler.execute();
	}

	async reap(): Promise<ReapResult> {
		return await this.scheduler.reap();
	}

	async prune(): Promise<RetentionSummary> {
		return await this.scheduler.prune();
	}

	async stop(): Promise<void> {
		await this.scheduler.stop();
	}
}
