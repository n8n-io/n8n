import type { Logger } from '@n8n/backend-common';
import type { WorkflowsConfig } from '@n8n/config';
import type { WorkflowPublicationOutboxRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { PublishedWorkflowEnqueuer } from '@/workflows/publication/published-workflow-enqueuer';

describe('PublishedWorkflowEnqueuer', () => {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);

	const outboxRepository = mock<WorkflowPublicationOutboxRepository>();

	let enqueuer: PublishedWorkflowEnqueuer;

	function createEnqueuer(useWorkflowPublicationService = true) {
		const workflowsConfig = mock<WorkflowsConfig>({ useWorkflowPublicationService });
		return new PublishedWorkflowEnqueuer(logger, workflowsConfig, outboxRepository);
	}

	beforeEach(() => {
		jest.clearAllMocks();
		enqueuer = createEnqueuer();
	});

	test('delegates to the outbox repository to enqueue all active workflows', async () => {
		await enqueuer.enqueueActiveWorkflows();

		expect(outboxRepository.enqueueAllActiveWorkflows).toHaveBeenCalledTimes(1);
	});

	describe('enqueueOnLeaderTakeover', () => {
		test('enqueues active workflows when the publication service is enabled', async () => {
			await createEnqueuer(true).enqueueOnLeaderTakeover();

			expect(outboxRepository.enqueueAllActiveWorkflows).toHaveBeenCalledTimes(1);
		});

		test('does nothing when the publication service is disabled', async () => {
			await createEnqueuer(false).enqueueOnLeaderTakeover();

			expect(outboxRepository.enqueueAllActiveWorkflows).not.toHaveBeenCalled();
		});
	});
});
