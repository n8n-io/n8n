import { Logger } from '@n8n/backend-common';
import { WorkflowPublicationOutbox, WorkflowPublicationOutboxRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';

import { ActivationErrorsService } from '@/activation-errors.service';
import { Push } from '@/push';
import type {
	PublicationResult,
	PublicationSkipReason,
} from '@/workflows/publication/publication-result';
import type { TriggerActivationFailure } from '@/workflows/triggers/workflow-trigger-activator';

/**
 * Turns a {@link PublicationResult} into terminal state. This is the only place
 * that writes terminal outbox statuses and the only place that maps a result to
 * its side effects: clearing or (in a later phase) recording activation errors,
 * and pushing publication status to the UI.
 */
@Service()
export class PublicationStatusReporter {
	constructor(
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
		private readonly outboxRepository: WorkflowPublicationOutboxRepository,
		private readonly activationErrorsService: ActivationErrorsService,
		private readonly push: Push,
	) {
		this.logger = this.logger.scoped('workflow-publication');
	}

	async report(record: WorkflowPublicationOutbox, result: PublicationResult): Promise<void> {
		switch (result.type) {
			case 'completed': {
				await this.complete(record);
				this.push.broadcast({
					type: 'workflowActivated',
					data: { workflowId: record.workflowId, activeVersionId: record.publishedVersionId },
				});
				return;
			}

			case 'unpublished': {
				await this.complete(record);
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
				this.errorReporter.error(result.error, { shouldBeLogged: true });
				await this.outboxRepository.markFailed(record.id, result.error.message);
				this.pushFailedToActivate(record.workflowId, result.error.message);
				return;
			}

			case 'partial': {
				await this.reportPartial(record, result.failures);
				return;
			}
		}
	}

	/**
	 * Reports a partial publication: the new version stays published with the
	 * surviving triggers running. Records a `partial_success` status, registers a
	 * structured per-node activation error so it surfaces on reload, and pushes the
	 * failure detail to connected clients. The workflow is not unpublished.
	 *
	 * The push is leader-local for now; multi-main pubsub routing is tracked as
	 * follow-up work (see CAT-3423).
	 */
	private async reportPartial(
		record: WorkflowPublicationOutbox,
		failures: TriggerActivationFailure[],
	): Promise<void> {
		const errorMessage = this.formatActivationError(failures);

		this.logger.warn('Workflow partially published; some triggers failed to activate', {
			workflowId: record.workflowId,
			outboxId: record.id,
			failedNodeIds: failures.map((failure) => failure.nodeId),
		});

		await this.outboxRepository.markPartialSuccess(record.id, errorMessage);
		await this.activationErrorsService.register(record.workflowId, errorMessage);

		this.push.broadcast({
			type: 'workflowPartiallyActivated',
			data: {
				workflowId: record.workflowId,
				activeVersionId: record.publishedVersionId,
				errorMessage,
				failedNodes: failures.map((failure) => ({
					nodeId: failure.nodeId,
					nodeName: failure.nodeName,
					errorMessage: failure.error.message,
				})),
			},
		});
	}

	/** Builds a human-readable message naming each failed node and its error. */
	private formatActivationError(failures: TriggerActivationFailure[]): string {
		const detail = failures
			.map((failure) => `"${failure.nodeName}": ${failure.error.message}`)
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

	/** Marks the record completed and clears any activation errors for the workflow. */
	private async complete(record: WorkflowPublicationOutbox): Promise<void> {
		await this.outboxRepository.markCompleted(record.id);
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
