import { Logger } from '@n8n/backend-common';
import {
	WorkflowPublicationOutbox,
	WorkflowPublicationOutboxRepository,
	WorkflowPublicationTriggerStatusRepository,
	type TriggerStatusRow,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';

import { ActivationErrorsService } from '@/activation-errors.service';
import { Push } from '@/push';
import type {
	FailedTriggerPublicationStatus,
	PublicationResult,
	PublicationSkipReason,
	TriggerPublicationStatus,
} from '@/workflows/publication/publication-result';

/**
 * Turns a {@link PublicationResult} into terminal state. This is the only place
 * that writes terminal outbox statuses and the only place that maps a result to
 * its side effects: persisting per-trigger status rows, clearing legacy activation
 * errors on success, and pushing publication status to the UI.
 */
@Service()
export class PublicationStatusReporter {
	constructor(
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
		private readonly outboxRepository: WorkflowPublicationOutboxRepository,
		private readonly activationErrorsService: ActivationErrorsService,
		private readonly push: Push,
		private readonly triggerStatusRepository: WorkflowPublicationTriggerStatusRepository,
	) {
		this.logger = this.logger.scoped('workflow-publication');
	}

	async report(record: WorkflowPublicationOutbox, result: PublicationResult): Promise<void> {
		switch (result.type) {
			case 'completed': {
				await this.complete(record, this.toRows(record, result.triggerStatuses));
				this.push.broadcast({
					type: 'workflowActivated',
					data: { workflowId: record.workflowId, activeVersionId: record.publishedVersionId },
				});
				return;
			}

			case 'unpublished': {
				await this.complete(record, /*triggerStatuses=*/ []);
				this.push.broadcast({
					type: 'workflowDeactivated',
					data: { workflowId: record.workflowId },
				});
				return;
			}

			case 'skipped': {
				this.logSkip(record, result.reason);
				await this.complete(record);
				return;
			}

			case 'version-missing': {
				const errorMessage = 'Published version not found';
				this.logger.warn('Published version not found, marking outbox record as failed', {
					workflowId: record.workflowId,
					publishedVersionId: record.publishedVersionId,
					outboxId: record.id,
				});
				await this.outboxRepository.markFailed(record.id, errorMessage);
				this.pushFailedToActivate(record.workflowId, errorMessage);
				return;
			}

			case 'failed': {
				const { triggerStatuses } = result;
				await this.outboxRepository.manager.transaction(async (trx) => {
					if (triggerStatuses) {
						await this.triggerStatusRepository.replaceForWorkflow(
							record.workflowId,
							this.toRows(record, triggerStatuses),
							trx,
						);
					}
					await this.outboxRepository.markFailed(record.id, result.error.message, trx);
				});
				this.errorReporter.error(result.error, { shouldBeLogged: true });
				this.pushFailedToActivate(record.workflowId, result.error.message);
				return;
			}

			case 'partial': {
				await this.reportPartial(record, result.triggerStatuses);
				return;
			}
		}
	}

	/**
	 * Reports a partial publication: the new version stays published with the
	 * surviving triggers running. Marks the outbox record `partial_success`,
	 * full-replaces the workflow's per-trigger status rows, and pushes the
	 * per-node failure detail to connected clients. The workflow is not unpublished.
	 *
	 * The push is leader-local for now; multi-main pubsub routing is tracked as
	 * follow-up work (see CAT-3423).
	 */
	private async reportPartial(
		record: WorkflowPublicationOutbox,
		triggerStatuses: TriggerPublicationStatus[],
	): Promise<void> {
		const failures = triggerStatuses.filter(
			(s): s is FailedTriggerPublicationStatus => s.status === 'failed',
		);
		const errorMessage = this.formatActivationError(failures);

		this.logger.warn('Workflow partially published; some triggers failed to activate', {
			workflowId: record.workflowId,
			outboxId: record.id,
			failedNodeIds: failures.map((s) => s.nodeId),
		});

		await this.outboxRepository.manager.transaction(async (trx) => {
			await this.triggerStatusRepository.replaceForWorkflow(
				record.workflowId,
				this.toRows(record, triggerStatuses),
				trx,
			);
			await this.outboxRepository.markPartialSuccess(record.id, errorMessage, trx);
		});

		this.push.broadcast({
			type: 'workflowPartiallyActivated',
			data: {
				workflowId: record.workflowId,
				activeVersionId: record.publishedVersionId,
				errorMessage,
				failedNodes: failures.map((triggerStatus) => ({
					nodeId: triggerStatus.nodeId,
					nodeName: triggerStatus.nodeName,
					errorMessage: triggerStatus.errorMessage,
				})),
			},
		});
	}

	/** Maps trigger publication statuses to repository row objects, stamping the published version. */
	private toRows(
		record: WorkflowPublicationOutbox,
		statuses: TriggerPublicationStatus[],
	): TriggerStatusRow[] {
		return statuses.map((triggerStatus) => ({
			nodeId: triggerStatus.nodeId,
			versionId: record.publishedVersionId,
			status: triggerStatus.status,
			errorMessage: triggerStatus.status === 'failed' ? triggerStatus.errorMessage : null,
		}));
	}

	/** Builds a human-readable message naming each failed node and its error. */
	private formatActivationError(failures: FailedTriggerPublicationStatus[]): string {
		const detail = failures
			.map((status) => `"${status.nodeName}": ${status.errorMessage}`)
			.join('; ');

		return `Some triggers failed to activate: ${detail}`;
	}

	/** Broadcasts a failed-to-activate status to connected clients (leader-local). */
	private pushFailedToActivate(workflowId: string, errorMessage: string): void {
		this.push.broadcast({
			type: 'workflowFailedToActivate',
			data: { workflowId, errorMessage },
		});
	}

	/**
	 * Marks the record completed and clears any activation errors for the workflow.
	 * If there are any per-trigger statuses passed in, they are persisted in the same transaction.
	 */
	private async complete(
		record: WorkflowPublicationOutbox,
		triggerStatuses?: TriggerStatusRow[],
	): Promise<void> {
		await this.outboxRepository.manager.transaction(async (trx) => {
			if (triggerStatuses !== undefined) {
				await this.triggerStatusRepository.replaceForWorkflow(
					record.workflowId,
					triggerStatuses,
					trx,
				);
			}
			await this.outboxRepository.markCompleted(record.id, trx);
		});
		await this.activationErrorsService.deregister(record.workflowId);
	}

	private logSkip(record: WorkflowPublicationOutbox, reason: PublicationSkipReason): void {
		const context = { workflowId: record.workflowId, outboxId: record.id };

		if (reason === 'workflow-not-found') {
			this.logger.warn('Workflow not found, marking outbox record as completed', context);
			return;
		}

		this.logger.debug('Workflow is no longer active, marking outbox record as completed', context);
	}
}
