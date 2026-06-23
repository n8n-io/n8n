import { Logger } from '@n8n/backend-common';
import { WorkflowsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { WorkflowPublicationOutboxRepository } from '@n8n/db';
import { OnLeaderStepdown, OnLeaderTakeover, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { InstanceSettings, SpanStatus, Tracing } from 'n8n-core';

/**
 * Periodically deletes terminal workflow publication outbox records on the leader
 * so the table doesn't grow unbounded (one terminal row per publish/unpublish, plus
 * one per active workflow on every leader startup). Terminal rows have no functional
 * readers - they're a short-lived diagnostic trail - so `completed` rows are pruned
 * quickly while `failed`/`partial_success` rows (which carry an error message) are
 * kept longer. Active records are never touched.
 */
@Service()
export class WorkflowPublicationOutboxCleanupService {
	private cleanupInterval: NodeJS.Timeout | undefined;

	private isShuttingDown = false;

	private readonly logger: Logger;

	constructor(
		logger: Logger,
		private readonly workflowsConfig: WorkflowsConfig,
		private readonly outboxRepository: WorkflowPublicationOutboxRepository,
		private readonly instanceSettings: InstanceSettings,
		private readonly tracing: Tracing,
	) {
		this.logger = logger.scoped('workflow-publication');
	}

	init() {
		if (!this.instanceSettings.isLeader) return;

		this.startCleanup();

		// Run an initial pass at startup rather than waiting a full interval: a restart
		// enqueues a terminal row per active workflow, so a backlog is likely waiting.
		if (this.cleanupInterval) void this.cleanup();
	}

	@OnLeaderTakeover()
	startCleanup() {
		if (!this.workflowsConfig.useWorkflowPublicationService) return;
		if (this.isShuttingDown || this.cleanupInterval) return;

		const intervalSeconds = this.workflowsConfig.publicationOutboxCleanupIntervalSeconds;
		this.cleanupInterval = setInterval(
			async () => await this.cleanup(),
			intervalSeconds * Time.seconds.toMilliseconds,
		);

		this.logger.debug(`Outbox cleanup scheduled every ${intervalSeconds}s`);
	}

	@OnLeaderStepdown()
	stopCleanup() {
		clearInterval(this.cleanupInterval);
		this.cleanupInterval = undefined;
	}

	@OnShutdown()
	shutdown() {
		this.isShuttingDown = true;
		this.stopCleanup();
	}

	private async cleanup() {
		const completedRetentionSeconds =
			this.workflowsConfig.publicationOutboxCompletedRetentionHours * Time.hours.toSeconds;
		const failedRetentionSeconds =
			this.workflowsConfig.publicationOutboxFailedRetentionHours * Time.hours.toSeconds;
		const batchSize = this.workflowsConfig.publicationOutboxCleanupBatchSize;

		await this.tracing.startSpan(
			{ name: 'Publication outbox cleanup', op: 'publication.outbox.cleanup' },
			async (span) => {
				let totalDeleted = 0;
				try {
					let deleted: number;
					// Stop looping if a shutdown begins mid-cleanup; the next leader picks up
					// the rest on its next cycle.
					do {
						deleted = await this.outboxRepository.deleteTerminalOlderThan(
							completedRetentionSeconds,
							failedRetentionSeconds,
							batchSize,
						);
						totalDeleted += deleted;
					} while (deleted >= batchSize && !this.isShuttingDown);

					span.setStatus({ code: SpanStatus.ok });

					if (totalDeleted > 0) {
						this.logger.debug('Cleaned up terminal workflow publication outbox records', {
							count: totalDeleted,
						});
					}
				} catch (error) {
					span.setStatus({ code: SpanStatus.error });
					this.logger.error('Failed to clean up workflow publication outbox records', { error });
				} finally {
					span.setAttribute('n8n.publication.records_deleted', totalDeleted);
				}
			},
		);
	}
}
