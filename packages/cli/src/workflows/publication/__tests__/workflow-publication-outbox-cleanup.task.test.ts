import type { WorkflowsConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import type { WorkflowPublicationOutboxCleanupService } from '../workflow-publication-outbox-cleanup.service';
import { WorkflowPublicationOutboxCleanupTask } from '../workflow-publication-outbox-cleanup.task';

describe('WorkflowPublicationOutboxCleanupTask', () => {
	const config = mock<WorkflowsConfig>({ publicationOutboxCleanupIntervalSeconds: 30 });
	const cleanupService = mock<WorkflowPublicationOutboxCleanupService>();
	const task = new WorkflowPublicationOutboxCleanupTask(config, cleanupService);

	it('should declare the configured cleanup cadence', () => {
		expect(task.name).toBe('publication-outbox-cleanup');
		expect(task.schedule).toEqual({ kind: 'interval', intervalSeconds: 30 });
		expect(task.effects).toBe('idempotent');
		expect(task.durable).toBe(false);
	});

	it('should clean up the outbox on run', async () => {
		await task.run();

		expect(cleanupService.cleanup).toHaveBeenCalledTimes(1);
	});
});
