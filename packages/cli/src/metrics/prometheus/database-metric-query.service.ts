import { ScheduledJobOwnerType, Time } from '@n8n/constants';
import {
	LicenseMetricsRepository,
	ScheduledJobRepository,
	ScheduledTaskRepository,
	WorkflowPublicationOutboxRepository,
	type WorkflowPublicationOutboxStatus,
	WorkflowRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';

import { CachedMetricQueryFactory } from './cached-metric-query';

export type WorkflowStatistics = Awaited<
	ReturnType<LicenseMetricsRepository['getLicenseRenewalMetrics']>
>;

type PublicationStats = Partial<
	Record<WorkflowPublicationOutboxStatus, { count: number; oldestMs: number }>
>;

/** The stored schedule of one durable system task, as JSON so the cache can hold it. */
export type DurableJobState = {
	task: string;
	/** Enabled and not quarantined, so the scheduler will claim it. */
	runnable: boolean;
	nextRunAtSeconds: number | null;
};

/** Owns database reads for metrics. Each method returns a query with outage handling. */
@Service()
export class DatabaseMetricQueryService {
	constructor(
		private readonly cachedQueries: CachedMetricQueryFactory,
		private readonly workflowRepository: WorkflowRepository,
		private readonly licenseMetricsRepository: LicenseMetricsRepository,
		private readonly outboxRepository: WorkflowPublicationOutboxRepository,
		private readonly taskRepository: ScheduledTaskRepository,
		private readonly jobRepository: ScheduledJobRepository,
	) {}

	activeWorkflowCount(ttlMs: number) {
		return this.cachedQueries.create({
			cacheKey: 'metrics:active-workflow-count:v2',
			ttlMs,
			query: async () => await this.workflowRepository.getActiveCount(),
		});
	}

	workflowInfo(ttlMs: number, activeOnly: boolean) {
		return this.cachedQueries.create({
			cacheKey: activeOnly ? 'metrics:active-workflow-info:v1' : 'metrics:workflow-info:v2',
			ttlMs,
			query: async () => await this.workflowRepository.getWorkflowInfo({ activeOnly }),
		});
	}

	workflowStatistics(ttlMs: number) {
		return this.cachedQueries.create<WorkflowStatistics>({
			cacheKey: 'metrics:workflow-statistics:shared:v2',
			ttlMs,
			query: async () => await this.licenseMetricsRepository.getLicenseRenewalMetrics(),
		});
	}

	workflowPublication(ttlMs: number) {
		return this.cachedQueries.create<PublicationStats>({
			cacheKey: 'metrics:workflow-publication:outbox-record-stats:v2',
			ttlMs,
			query: async () => {
				const stats = await this.outboxRepository.getRecordStatsByStatus();
				const byStatus: PublicationStats = {};
				for (const [status, { count, oldestCreatedAt }] of stats) {
					byStatus[status] = { count, oldestMs: oldestCreatedAt.getTime() };
				}
				return byStatus;
			},
		});
	}

	schedulerSnapshot(ttlMs: number) {
		return this.cachedQueries.create({
			cacheKey: 'metrics:scheduler:snapshot:v1',
			ttlMs,
			query: async () => await this.taskRepository.getMetricSnapshot(),
		});
	}

	durableSystemTaskJobs(ttlMs: number) {
		return this.cachedQueries.create<DurableJobState[]>({
			cacheKey: 'metrics:system-tasks:durable-jobs:v1',
			ttlMs,
			query: async () => {
				const jobs = await this.jobRepository.findScheduleStatesByOwnerType(
					ScheduledJobOwnerType.SystemTask,
				);
				return jobs.map(({ ownerId, runnable, nextRunAt }) => ({
					task: ownerId,
					runnable,
					nextRunAtSeconds:
						nextRunAt === null ? null : nextRunAt.getTime() / Time.seconds.toMilliseconds,
				}));
			},
		});
	}
}
