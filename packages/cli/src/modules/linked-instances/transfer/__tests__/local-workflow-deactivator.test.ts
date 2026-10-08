import type { Logger } from '@n8n/backend-common';
import type { User, WorkflowEntity } from '@n8n/db';
import { LockedError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { CollaborationService } from '@/collaboration/collaboration.service';
import type { WorkflowService } from '@/workflows/workflow.service';

import { LocalWorkflowDeactivator } from '../local-workflow-deactivator';

function setup() {
	const workflowService = mock<WorkflowService>();
	const collaborationService = mock<CollaborationService>();
	const logger = mock<Logger>();
	const deactivator = new LocalWorkflowDeactivator(workflowService, collaborationService, logger);
	const alice = mock<User>({ id: 'alice' });
	workflowService.deactivateWorkflow.mockResolvedValue(
		mock<WorkflowEntity>({ id: 'wf1', activeVersionId: null }),
	);
	return { deactivator, workflowService, collaborationService, logger, alice };
}

describe('LocalWorkflowDeactivator', () => {
	it('checks the write lock of the editor tab, turns off the workflow and tells open editors', async () => {
		const { deactivator, workflowService, collaborationService, alice } = setup();

		const off = await deactivator.turnOff(alice, 'wf1', { clientId: 'tab-1' });

		expect(off).toBe(true);
		expect(collaborationService.validateWriteLock).toHaveBeenCalledWith(
			'alice',
			'tab-1',
			'wf1',
			'deactivate',
		);
		expect(workflowService.deactivateWorkflow).toHaveBeenCalledWith(alice, 'wf1', { source: 'ui' });
		expect(collaborationService.broadcastWorkflowUpdate).toHaveBeenCalledWith('wf1', 'alice');
		expect(collaborationService.validateWriteLock.mock.invocationCallOrder[0]).toBeLessThan(
			workflowService.deactivateWorkflow.mock.invocationCallOrder[0],
		);
	});

	it('passes the source of the action on', async () => {
		const { deactivator, workflowService, alice } = setup();

		await deactivator.turnOff(alice, 'wf1', { source: 'n8n-ai' });

		expect(workflowService.deactivateWorkflow).toHaveBeenCalledWith(alice, 'wf1', {
			source: 'n8n-ai',
		});
	});

	it('returns false when a version stays live', async () => {
		const { deactivator, workflowService, alice } = setup();
		workflowService.deactivateWorkflow.mockResolvedValue(
			mock<WorkflowEntity>({ id: 'wf1', activeVersionId: 'v2' }),
		);

		expect(await deactivator.turnOff(alice, 'wf1')).toBe(false);
	});

	it('changes nothing while another user edits the workflow', async () => {
		const { deactivator, workflowService, collaborationService, alice } = setup();
		const locked = new LockedError(
			'Cannot deactivate workflow - another user currently has write access',
		);
		collaborationService.validateWriteLock.mockRejectedValue(locked);

		await expect(deactivator.turnOff(alice, 'wf1', { clientId: 'tab-1' })).rejects.toBe(locked);
		expect(workflowService.deactivateWorkflow).not.toHaveBeenCalled();
	});

	it('only logs a failed notification, because the workflow is off already', async () => {
		const { deactivator, collaborationService, logger, alice } = setup();
		collaborationService.broadcastWorkflowUpdate.mockRejectedValue(new Error('push down'));

		expect(await deactivator.turnOff(alice, 'wf1')).toBe(true);
		expect(logger.warn).toHaveBeenCalledWith(
			'Failed to tell open editors that a moved workflow was turned off',
			{ workflowId: 'wf1', error: 'push down' },
		);
	});
});
