import type { WorkflowsConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import type { WorkflowPublicationOutboxCleanupService } from '../workflow-publication-outbox-cleanup.service';
import { WorkflowPublicationOutboxCleanupTask } from '../workflow-publication-outbox-cleanup.task';

describe('WorkflowPublicationOutboxCleanupTask', () => {
	const config = mock<WorkflowsConfig>({ publicationOutboxCleanupIntervalSeconds: 30 });
	const cleanupService = mock<WorkflowPublicationOutboxCleanupService>();
	const task = new WorkflowPublicationOutboxCleanupTask(config, cleanupService);

	it('should declare the configured cleanup cadence and a run on takeover', () => {
		expect(task.name).toBe('publication-outbox-cleanup');
		expect(task.schedule).toEqual({ kind: 'interval', intervalSeconds: 30 });
		expect(task.effects).toBe('idempotent');
		expect(task.durable).toBe(false);
		expect(task.runOnTakeover).toBe(true);
	});

	it('should clean up the outbox on run, handing the pass its abort signal', async () => {
		const { signal } = new AbortController();

		await task.run(signal);

		expect(cleanupService.cleanup).toHaveBeenCalledExactlyOnceWith(signal);
	});
});
