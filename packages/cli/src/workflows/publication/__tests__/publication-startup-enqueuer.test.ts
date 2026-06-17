import type { Logger } from '@n8n/backend-common';
import type { WorkflowPublicationOutboxRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { PublicationStartupEnqueuer } from '@/workflows/publication/publication-startup-enqueuer';

describe('PublicationStartupEnqueuer', () => {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);

	const outboxRepository = mock<WorkflowPublicationOutboxRepository>();

	let enqueuer: PublicationStartupEnqueuer;

	beforeEach(() => {
		jest.clearAllMocks();
		enqueuer = new PublicationStartupEnqueuer(logger, outboxRepository);
	});

	test('delegates to the outbox repository to enqueue all active workflows', async () => {
		await enqueuer.enqueueActiveWorkflows();

		expect(outboxRepository.enqueueAllActiveWorkflows).toHaveBeenCalledTimes(1);
	});
});
