import { Logger } from '@n8n/backend-common';
import { WorkflowsConfig } from '@n8n/config';
import { WorkflowPublicationOutboxRepository } from '@n8n/db';
import { OnLeaderTakeover } from '@n8n/decorators';
import { Service } from '@n8n/di';

import { WorkflowPublicationOutboxConsumer } from '@/workflows/publication/workflow-publication-outbox-consumer';

/**
 * Enqueues a publication outbox record for every active workflow, on leader
 * startup and on leader takeover (the two moments an instance becomes leader).
 */
@Service()
export class PublishedWorkflowEnqueuer {
	constructor(
		private readonly logger: Logger,
		private readonly workflowsConfig: WorkflowsConfig,
		private readonly outboxRepository: WorkflowPublicationOutboxRepository,
		private readonly outboxConsumer: WorkflowPublicationOutboxConsumer,
	) {
		this.logger = this.logger.scoped('workflow-publication');
	}

	/**
	 * Enqueue a publication outbox record for every active workflow that needs
	 * leader-side publication at its current active version. Workflows with only
	 * persisted (webhook) triggers are skipped: those live durably in
	 * `webhook_entity` and are served by any main, so a new leader has no
	 * in-memory state to rebuild for them. This is idempotent.
	 */
	async enqueueActiveWorkflows(): Promise<void> {
		await this.outboxRepository.enqueueForLeaderHandoff();
		this.logger.debug('Enqueued active workflow publication records');
	}

	/**
	 * On leader takeover, requeue every active workflow exactly like startup. Safe
	 * because publication is idempotent and a no-op publish emits no pubsub, so
	 * unchanged workflows stay quiet.
	 */
	@OnLeaderTakeover()
	async enqueueOnLeaderTakeover(): Promise<void> {
		if (!this.workflowsConfig.useWorkflowPublicationService) return;
		await this.enqueueActiveWorkflows();
		this.outboxConsumer.startPolling();
		await this.outboxConsumer.drainPending();
	}
}
