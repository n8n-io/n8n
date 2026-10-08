// Only DI tokens here. Stubs keep the large import graphs of these services out of the test.
vi.mock('@/workflows/workflow.service', () => ({ WorkflowService: class {} }));
vi.mock('@/collaboration/collaboration.service', () => ({ CollaborationService: class {} }));

import { User, type WorkflowEntity } from '@n8n/db';
import { BadRequestError, LockedError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { CollaborationService } from '@/collaboration/collaboration.service';
import type { WorkflowService } from '@/workflows/workflow.service';

import { AutomationWorkflowPublisher } from '../automation-workflow-publisher';

const user = Object.assign(new User(), { id: 'user-1' });
const options = { source: 'n8n-ai', versionId: 'v-2' } as const;

describe('AutomationWorkflowPublisher', () => {
	const workflowService = mock<WorkflowService>();
	const collaborationService = mock<CollaborationService>();
	const publisher = new AutomationWorkflowPublisher(workflowService, collaborationService);
	let calls: string[];

	beforeEach(() => {
		vi.resetAllMocks();
		calls = [];
		collaborationService.ensureWorkflowEditable.mockImplementation(async () => {
			calls.push('check lock');
		});
		workflowService.activateWorkflow.mockImplementation(async (_user, workflowId, given) => {
			calls.push('activate');
			return { id: workflowId, activeVersionId: given?.versionId ?? null } as WorkflowEntity;
		});
		collaborationService.broadcastWorkflowUpdate.mockImplementation(async () => {
			calls.push('notify editors');
		});
	});

	it('publishes the agreed version as the user and tells open editors', async () => {
		await expect(publisher.activate(user, 'wf-1', options)).resolves.toBe(true);

		expect(collaborationService.ensureWorkflowEditable).toHaveBeenCalledWith('wf-1');
		expect(workflowService.activateWorkflow).toHaveBeenCalledWith(user, 'wf-1', {
			source: 'n8n-ai',
			versionId: 'v-2',
		});
		expect(collaborationService.broadcastWorkflowUpdate).toHaveBeenCalledWith('wf-1', 'user-1');
		expect(calls).toEqual(['check lock', 'activate', 'notify editors']);
	});

	it('returns false when no version is live after publishing', async () => {
		workflowService.activateWorkflow.mockResolvedValue({
			id: 'wf-1',
			activeVersionId: null,
		} as WorkflowEntity);

		await expect(publisher.activate(user, 'wf-1', options)).resolves.toBe(false);
	});

	it('does not publish a workflow that someone edits in the editor', async () => {
		const locked = new LockedError('The workflow is open in the editor');
		collaborationService.ensureWorkflowEditable.mockRejectedValue(locked);

		await expect(publisher.activate(user, 'wf-1', options)).rejects.toBe(locked);

		expect(workflowService.activateWorkflow).not.toHaveBeenCalled();
		expect(collaborationService.broadcastWorkflowUpdate).not.toHaveBeenCalled();
	});

	it('does not tell editors about a publish that failed', async () => {
		const failure = new BadRequestError('Webhook path is already in use');
		workflowService.activateWorkflow.mockRejectedValue(failure);

		await expect(publisher.activate(user, 'wf-1', options)).rejects.toBe(failure);

		expect(collaborationService.broadcastWorkflowUpdate).not.toHaveBeenCalled();
	});

	describe('assertEditable', () => {
		it('passes when nobody edits the workflow, and changes nothing', async () => {
			await expect(publisher.assertEditable('wf-1')).resolves.toBeUndefined();

			expect(collaborationService.ensureWorkflowEditable).toHaveBeenCalledWith('wf-1');
			expect(calls).toEqual(['check lock']);
		});

		it('fails while someone edits the workflow in the editor', async () => {
			const locked = new LockedError('The workflow is open in the editor');
			collaborationService.ensureWorkflowEditable.mockRejectedValue(locked);

			await expect(publisher.assertEditable('wf-1')).rejects.toBe(locked);
			expect(workflowService.activateWorkflow).not.toHaveBeenCalled();
		});
	});

	it('reports a live workflow also when the editors cannot be told', async () => {
		collaborationService.broadcastWorkflowUpdate.mockRejectedValue(new Error('push is down'));

		await expect(publisher.activate(user, 'wf-1', options)).resolves.toBe(true);
	});
});
