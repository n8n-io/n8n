import type { Logger } from '@n8n/backend-common';
import type { WorkflowsConfig } from '@n8n/config';
import type { WorkflowPublicationOutboxRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { PublishedWorkflowEnqueuer } from '@/workflows/publication/published-workflow-enqueuer';
import type { WorkflowPublicationOutboxConsumer } from '@/workflows/publication/workflow-publication-outbox-consumer';

describe('PublishedWorkflowEnqueuer', () => {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);

	const outboxRepository = mock<WorkflowPublicationOutboxRepository>();
	const outboxConsumer = mock<WorkflowPublicationOutboxConsumer>();

	let enqueuer: PublishedWorkflowEnqueuer;

	function createEnqueuer(useWorkflowPublicationService = true) {
		const workflowsConfig = mock<WorkflowsConfig>({ useWorkflowPublicationService });
		return new PublishedWorkflowEnqueuer(logger, workflowsConfig, outboxRepository, outboxConsumer);
	}

	beforeEach(() => {
		vi.clearAllMocks();
		enqueuer = createEnqueuer();
	});

	test('delegates to the outbox repository to enqueue all active workflows', async () => {
		await enqueuer.enqueueActiveWorkflows();

		expect(outboxRepository.enqueueAllActiveWorkflows).toHaveBeenCalledTimes(1);
	});

	describe('enqueueOnLeaderTakeover', () => {
		test('enqueues active workflows and drains immediately when the publication service is enabled', async () => {
			await createEnqueuer(true).enqueueOnLeaderTakeover();

			expect(outboxRepository.enqueueAllActiveWorkflows).toHaveBeenCalledTimes(1);
			expect(outboxConsumer.startPolling).toHaveBeenCalledTimes(1);
			expect(outboxConsumer.drainPending).toHaveBeenCalledTimes(1);
		});

		test('does nothing when the publication service is disabled', async () => {
			await createEnqueuer(false).enqueueOnLeaderTakeover();

			expect(outboxRepository.enqueueAllActiveWorkflows).not.toHaveBeenCalled();
			expect(outboxConsumer.startPolling).not.toHaveBeenCalled();
			expect(outboxConsumer.drainPending).not.toHaveBeenCalled();
		});
	});
});
