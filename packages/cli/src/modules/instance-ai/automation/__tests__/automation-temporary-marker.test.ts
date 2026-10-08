// Only a DI token here. A stub keeps the import graph of the provenance service out of the test.
vi.mock('../../provenance/workflow-provenance.service', () => ({
	WorkflowProvenanceService: class {},
}));

import type { Logger } from '@n8n/backend-common';
import { type AiBuilderTemporaryWorkflowRepository, User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { WorkflowProvenanceService } from '../../provenance/workflow-provenance.service';
import { AutomationTemporaryMarker } from '../automation-temporary-marker';

const user = Object.assign(new User(), { id: 'user-1' });

describe('AutomationTemporaryMarker', () => {
	const temporaryWorkflows = mock<AiBuilderTemporaryWorkflowRepository>();
	const provenance = mock<WorkflowProvenanceService>();
	const logger = mock<Logger>();
	const marker = new AutomationTemporaryMarker(temporaryWorkflows, provenance, logger);
	let calls: string[];

	beforeEach(() => {
		vi.resetAllMocks();
		calls = [];
		temporaryWorkflows.findThreadIdForWorkflow.mockImplementation(async () => {
			calls.push('read chat');
			return 'thread-1';
		});
		provenance.record.mockImplementation(async () => {
			calls.push('record');
		});
		temporaryWorkflows.unmark.mockImplementation(async () => {
			calls.push('unmark');
		});
	});

	it.each([true, false])('reads whether the workflow is marked (%s)', async (marked) => {
		temporaryWorkflows.existsForWorkflow.mockResolvedValue(marked);

		await expect(marker.isMarked('wf-1')).resolves.toBe(marked);
		expect(temporaryWorkflows.existsForWorkflow).toHaveBeenCalledWith('wf-1');
	});

	it('records the chat that built the workflow, then removes the marker', async () => {
		await marker.clear(user, 'wf-1');

		expect(temporaryWorkflows.findThreadIdForWorkflow).toHaveBeenCalledWith('wf-1');
		expect(provenance.record).toHaveBeenCalledWith('wf-1', 'thread-1', 'user-1');
		expect(temporaryWorkflows.unmark).toHaveBeenCalledWith('wf-1');
		expect(calls).toEqual(['read chat', 'record', 'unmark']);
		expect(logger.warn).not.toHaveBeenCalled();
	});

	it('removes the marker without a record when the marker names no chat', async () => {
		temporaryWorkflows.findThreadIdForWorkflow.mockResolvedValue(null);

		await marker.clear(user, 'wf-1');

		expect(provenance.record).not.toHaveBeenCalled();
		expect(temporaryWorkflows.unmark).toHaveBeenCalledWith('wf-1');
	});

	it.each([
		['the chat cannot be recorded', 'record', new Error('database is down')],
		['the chat cannot be read', 'read', 'connection lost'],
	])(
		'still removes the marker and logs a warning when %s',
		async (_label, failingStep, failure) => {
			const fail = async () => {
				throw failure;
			};
			if (failingStep === 'record') provenance.record.mockImplementation(fail);
			else temporaryWorkflows.findThreadIdForWorkflow.mockImplementation(fail);

			await expect(marker.clear(user, 'wf-1')).resolves.toBeUndefined();

			expect(temporaryWorkflows.unmark).toHaveBeenCalledWith('wf-1');
			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to record the Assistant chat of a kept workflow',
				{
					workflowId: 'wf-1',
					error: failure instanceof Error ? failure.message : failure,
				},
			);
		},
	);

	it('fails when the marker cannot be removed, so that the caller does not report a kept workflow', async () => {
		temporaryWorkflows.unmark.mockRejectedValue(new Error('database is down'));

		await expect(marker.clear(user, 'wf-1')).rejects.toThrow('database is down');
	});
});
