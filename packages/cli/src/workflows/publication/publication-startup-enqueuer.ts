import { Logger } from '@n8n/backend-common';
import { WorkflowPublicationOutboxRepository } from '@n8n/db';
import { Service } from '@n8n/di';

/**
 * Enqueues publication outbox records for the active workflows so the consumer can
 * reconcile their triggers. The enqueue routine is intentionally free of leader/flag
 * gating so it can be reused both on leader startup and from the leader-takeover
 * handler; the caller decides when to run it.
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
	 * active version. Idempotent: the enqueue upserts on the partial unique index,
	 * so a workflow that already has a pending record is updated in place rather
	 * than duplicated.
	 */
	async enqueueActiveWorkflows(): Promise<void> {
		await this.outboxRepository.enqueueAllActiveWorkflows();
		this.logger.debug('Enqueued active workflow publication records on startup');
	}
}
