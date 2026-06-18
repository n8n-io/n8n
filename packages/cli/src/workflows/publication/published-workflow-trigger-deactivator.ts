import { Logger } from '@n8n/backend-common';
import { WorkflowsConfig } from '@n8n/config';
import { OnLeaderStepdown, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { ActiveWorkflowTriggers } from 'n8n-core';

import { WorkflowPublicationOutboxConsumer } from '@/workflows/publication/workflow-publication-outbox-consumer';

/**
 * Tears down in-memory triggers on leader stepdown and shutdown.
 */
@Service()
export class PublishedWorkflowTriggerDeactivator {
	constructor(
		private readonly logger: Logger,
		private readonly workflowsConfig: WorkflowsConfig,
		private readonly activeWorkflowTriggers: ActiveWorkflowTriggers,
		private readonly outboxConsumer: WorkflowPublicationOutboxConsumer,
	) {
		this.logger = this.logger.scoped('workflow-publication');
	}

	/**
	 * Deactivates all non-webhook triggers.
	 */
	@OnLeaderStepdown()
	@OnShutdown()
	async deactivateAllNonWebhookTriggers(): Promise<void> {
		if (!this.workflowsConfig.useWorkflowPublicationService) return;

		this.outboxConsumer.stopPolling();

		const workflowIds = this.activeWorkflowTriggers.getNonWebhookTriggerWorkflowIds();

		for (const workflowId of workflowIds) {
			await this.activeWorkflowTriggers.remove(workflowId);
		}
	}
}
