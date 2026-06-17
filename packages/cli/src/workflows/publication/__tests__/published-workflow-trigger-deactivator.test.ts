import type { Logger } from '@n8n/backend-common';
import type { WorkflowsConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';
import type { ActiveWorkflowTriggers } from 'n8n-core';

import { PublishedWorkflowTriggerDeactivator } from '@/workflows/publication/published-workflow-trigger-deactivator';
import type { WorkflowPublicationOutboxConsumer } from '@/workflows/publication/workflow-publication-outbox-consumer';

describe('PublishedWorkflowTriggerDeactivator', () => {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);

	const activeWorkflowTriggers = mock<ActiveWorkflowTriggers>();
	const outboxConsumer = mock<WorkflowPublicationOutboxConsumer>();

	function createDeactivator(useWorkflowPublicationService = true) {
		const workflowsConfig = mock<WorkflowsConfig>({ useWorkflowPublicationService });
		return new PublishedWorkflowTriggerDeactivator(
			logger,
			workflowsConfig,
			activeWorkflowTriggers,
			outboxConsumer,
		);
	}

	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('does nothing when the publication service is disabled', async () => {
		await createDeactivator(false).deactivateAllNonWebhookTriggers();

		expect(activeWorkflowTriggers.getNonWebhookTriggerWorkflowIds).not.toHaveBeenCalled();
		expect(activeWorkflowTriggers.remove).not.toHaveBeenCalled();
		expect(outboxConsumer.stopPolling).not.toHaveBeenCalled();
	});

	test('stops polling and deactivates each non-webhook trigger workflow', async () => {
		activeWorkflowTriggers.getNonWebhookTriggerWorkflowIds.mockReturnValue(['wf-1', 'wf-2']);

		await createDeactivator(true).deactivateAllNonWebhookTriggers();

		expect(outboxConsumer.stopPolling).toHaveBeenCalledTimes(1);
		expect(activeWorkflowTriggers.remove).toHaveBeenCalledWith('wf-1');
		expect(activeWorkflowTriggers.remove).toHaveBeenCalledWith('wf-2');
	});
});
