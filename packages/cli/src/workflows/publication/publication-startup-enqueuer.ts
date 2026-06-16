import { Logger } from '@n8n/backend-common';
import { WorkflowPublicationOutboxRepository } from '@n8n/db';
import { Service } from '@n8n/di';

/**
 * Handles workflow activation during startup by enqueuing them into the inbox
 */
@Service()
export class PublicationStartupEnqueuer {
	constructor(
		private readonly logger: Logger,
		private readonly outboxRepository: WorkflowPublicationOutboxRepository,
	) {
		this.logger = this.logger.scoped('workflow-publication');
	}

	/**
	 * Enqueue a publication outbox record for every active workflow at its current
	 * active version. This is idempotent.
	 */
	async enqueueActiveWorkflows(): Promise<void> {
		await this.outboxRepository.enqueueAllActiveWorkflows();
		this.logger.debug('Enqueued active workflow publication records on startup');
	}
}
