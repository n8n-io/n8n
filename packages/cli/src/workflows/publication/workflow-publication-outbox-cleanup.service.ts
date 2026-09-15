import { Logger } from '@n8n/backend-common';
import { WorkflowsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { WorkflowPublicationOutboxRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { SpanStatus, Tracing } from 'n8n-core';

import { EventService } from '@/events/event.service';
import type { PublicationOperationResult } from '@/events/maps/workflow-publication-metrics.event-map';

/**
 * Deletes terminal workflow publication outbox records so the table doesn't grow
 * unbounded (one terminal row per publish/unpublish, plus one per active workflow
 * on every leader startup). Terminal rows have no functional readers - they're a
 * short-lived diagnostic trail - so `completed` rows are pruned quickly while
 * `failed`/`partial_success` rows (which carry an error message) are kept longer.
 * Active records are never touched. The cadence, the startup pass and the abort
 * on stepdown or shutdown live on the `publication-outbox-cleanup` system task.
 */
@Service()
export class WorkflowPublicationOutboxCleanupService {
	private readonly logger: Logger;

	constructor(
		logger: Logger,
		private readonly workflowsConfig: WorkflowsConfig,
		private readonly outboxRepository: WorkflowPublicationOutboxRepository,
		private readonly tracing: Tracing,
		private readonly eventService: EventService,
	) {
		this.logger = logger.scoped('workflow-publication');
	}

	/**
	 * One bounded cleanup pass over terminal outbox rows. Never throws: a failed pass is logged.
	 * An aborted `signal` stops the pass after the current batch.
	 */
	async cleanup(signal: AbortSignal) {
		const completedRetentionSeconds =
			this.workflowsConfig.publicationOutboxCompletedRetentionHours * Time.hours.toSeconds;
		const failedRetentionSeconds =
			this.workflowsConfig.publicationOutboxFailedRetentionHours * Time.hours.toSeconds;
		const batchSize = this.workflowsConfig.publicationOutboxCleanupBatchSize;

		const startedAt = Date.now();
		await this.tracing.startSpan(
			{ name: 'Publication outbox cleanup', op: 'publication.outbox.cleanup' },
			async (span) => {
				let totalDeleted = 0;
				let result: PublicationOperationResult = 'success';
				try {
					let deleted: number;
					do {
						deleted = await this.outboxRepository.deleteTerminalOlderThan(
							completedRetentionSeconds,
							failedRetentionSeconds,
							batchSize,
						);
						totalDeleted += deleted;
					} while (deleted >= batchSize && !signal.aborted);

					span.setStatus({ code: SpanStatus.ok });

					if (totalDeleted > 0) {
						this.logger.debug('Cleaned up terminal workflow publication outbox records', {
							count: totalDeleted,
						});
					}
				} catch (error) {
					result = 'failure';
					span.setStatus({ code: SpanStatus.error });
					this.logger.error('Failed to clean up workflow publication outbox records', { error });
				} finally {
					span.setAttribute('n8n.publication.records_deleted', totalDeleted);
					this.eventService.emit('workflow-publication-outbox-cleanup', {
						result,
						deletedCount: totalDeleted,
						durationMs: Date.now() - startedAt,
					});
				}
			},
		);
	}
}
