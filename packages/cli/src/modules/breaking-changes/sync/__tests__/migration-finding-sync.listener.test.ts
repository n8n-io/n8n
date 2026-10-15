import { EventService } from '@n8n/backend-services';
import { mockLogger } from '@n8n/backend-test-utils';
import type { ErrorReporter } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import { MigrationFindingSyncListener } from '../migration-finding-sync.listener';
import type { MigrationFindingSyncService } from '../migration-finding-sync.service';

describe('MigrationFindingSyncListener', () => {
	const eventService = new EventService();
	const syncService = mock<MigrationFindingSyncService>();
	const errorReporter = mock<ErrorReporter>();

	new MigrationFindingSyncListener(eventService, syncService, mockLogger(), errorReporter).init();

	const workflowEvents = [
		'workflow-created',
		'workflow-saved',
		'workflow-activated',
		'workflow-imported',
	] as const;

	const emitWorkflowEvent = (eventName: (typeof workflowEvents)[number]) => {
		// The listener reads only the workflow id; the rest of each payload is irrelevant here.
		eventService.emit(eventName, { workflowId: 'wf-1', workflow: { id: 'wf-1' } } as never);
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it.each(workflowEvents)('re-checks the findings of the workflow on %s', async (eventName) => {
		emitWorkflowEvent(eventName);
		await new Promise(setImmediate);

		expect(syncService.syncWorkflow).toHaveBeenCalledTimes(1);
		expect(syncService.syncWorkflow).toHaveBeenCalledWith('wf-1');
	});

	it('reports a failing sync and does not propagate it', async () => {
		syncService.syncWorkflow.mockRejectedValueOnce(new Error('db down'));

		emitWorkflowEvent('workflow-saved');
		await new Promise(setImmediate);

		expect(errorReporter.error).toHaveBeenCalledWith(
			expect.any(Error),
			expect.objectContaining({ extra: { workflowId: 'wf-1' } }),
		);
	});
});
