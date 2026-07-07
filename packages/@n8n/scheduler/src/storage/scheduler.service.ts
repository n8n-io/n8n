import { Logger } from '@n8n/backend-common';
import { SchedulerConfig } from '@n8n/config';
import { ScheduledTaskRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { SpanStatus, Tracing } from 'n8n-core';

import { MaterializerStore } from './materializer-store';
import { DEFAULT_MATERIALIZER_OPTIONS, materialize } from '../core/materializer';
import type { MaterializerOptions, MaterializerSummary } from '../core/materializer';
import { DEFAULT_RETENTION_OPTIONS, prune } from '../core/retention';
import type { RetentionOptions, RetentionSummary } from '../core/retention';
import { SCHEDULER_ATTRIBUTES } from '../observability/attributes';

/**
 * This is the entry the lifecycle wiring drives on a timer; it does not schedule itself.
 * TODO TEMPORARY implementation and exposure of this package
 */
@Service()
export class SchedulerService {
	private readonly materializerOptions: MaterializerOptions;

	private readonly retentionOptions: RetentionOptions;

	constructor(
		private readonly store: MaterializerStore,
		private readonly tasks: ScheduledTaskRepository,
		private readonly logger: Logger,
		private readonly tracing: Tracing,
		config: SchedulerConfig,
	) {
		this.materializerOptions = {
			...DEFAULT_MATERIALIZER_OPTIONS,
			windowSeconds: config.materializationWindowSeconds,
		};
		this.retentionOptions = {
			...DEFAULT_RETENTION_OPTIONS,
			retentionSeconds: config.retentionSeconds,
			failedRetentionSeconds: config.failedRetentionSeconds,
		};
		if (config.failedRetentionSeconds < config.retentionSeconds) {
			this.logger.warn(
				'Scheduler retention keeps failed runs shorter than succeeded ones; failure evidence will be deleted first',
				{
					retentionSeconds: config.retentionSeconds,
					failedRetentionSeconds: config.failedRetentionSeconds,
				},
			);
		}
	}

	async materialize(): Promise<MaterializerSummary> {
		return await this.tracing.startSpan(
			{ name: 'Scheduler materialize', op: 'scheduler.materialize' },
			async (span) => {
				const summary = await materialize(
					this.store.runInTransaction,
					this.materializerOptions,
					(job, error) => {
						this.logger.error('Scheduler could not plan a job schedule; deferred for retry', {
							jobId: job.id,
							error: error instanceof Error ? error.message : String(error),
						});
					},
				);
				span.setAttribute(SCHEDULER_ATTRIBUTES.claimedJobs, summary.claimedJobs);
				span.setAttribute(SCHEDULER_ATTRIBUTES.occurrences, summary.occurrences);
				span.setAttribute(SCHEDULER_ATTRIBUTES.deferredJobs, summary.deferredJobs);
				span.setStatus({ code: SpanStatus.ok });
				return summary;
			},
		);
	}

	/**
	 * One retention pass: delete finished tasks past their windows.
	 */
	async prune(): Promise<RetentionSummary> {
		const summary = await prune(this.tasks, this.retentionOptions);
		if (!summary.drained) {
			this.logger.warn('Scheduler retention pass hit its batch budget; backlog remains', {
				...summary,
			});
		} else if (summary.deleted > 0) {
			this.logger.debug('Scheduler retention deleted finished tasks', { ...summary });
		}
		return summary;
	}
}
