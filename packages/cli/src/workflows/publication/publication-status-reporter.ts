import { Logger } from '@n8n/backend-common';
import { WorkflowPublicationOutbox, WorkflowPublicationOutboxRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';
import { UnexpectedError } from 'n8n-workflow';

import { ActivationErrorsService } from '@/activation-errors.service';
import type {
	PublicationResult,
	PublicationSkipReason,
} from '@/workflows/publication/publication-result';

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
	) {
		this.logger = this.logger.scoped('workflow-publication');
	}

	async report(record: WorkflowPublicationOutbox, result: PublicationResult): Promise<void> {
		switch (result.type) {
			case 'completed': {
				await this.complete(record);
				return;
			}

			case 'skipped': {
				this.logSkip(record, result.reason);
				await this.complete(record);
				return;
			}

			case 'version-missing': {
				this.logger.warn('Published version not found, marking outbox record as failed', {
					workflowId: record.workflowId,
					publishedVersionId: record.publishedVersionId,
					outboxId: record.id,
				});
				await this.outboxRepository.markFailed(record.id, 'Published version not found');
				return;
			}

			case 'failed': {
				this.errorReporter.error(result.error, { shouldBeLogged: true });
				await this.outboxRepository.markFailed(record.id, result.error.message);
				return;
			}

			case 'partial': {
				// TODO(CAT-3398): handle partial activation results. The applier never
				// produces this result yet, so reaching here is a programming error.
				throw new UnexpectedError('Partial workflow publication results are not handled yet', {
					cause: result.error,
					extra: { workflowId: record.workflowId, outboxId: record.id },
				});
			}
		}
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
