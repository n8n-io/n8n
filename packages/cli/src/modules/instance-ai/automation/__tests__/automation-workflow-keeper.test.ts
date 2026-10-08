// Only DI tokens here. Stubs keep the large import graphs of these services out of the test.
vi.mock('@/workflows/workflow.service', () => ({ WorkflowService: class {} }));
vi.mock('../../provenance/workflow-provenance.service', () => ({
	WorkflowProvenanceService: class {},
}));

import type { InstanceWriteAccessService } from '@n8n/backend-services';
import { type AiBuilderTemporaryWorkflowRepository, User, type WorkflowEntity } from '@n8n/db';
import { UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { WorkflowService } from '@/workflows/workflow.service';

import type { WorkflowProvenanceService } from '../../provenance/workflow-provenance.service';
import { AutomationWorkflowKeeper, type KeptWorkflow } from '../automation-workflow-keeper';

const user = Object.assign(new User(), { id: 'user-1' });

const workflow = (overrides: Partial<KeptWorkflow> = {}): KeptWorkflow => ({
	id: 'wf-1',
	name: 'Digest builder',
	isArchived: false,
	versionId: 'v-1',
	...overrides,
});

describe('AutomationWorkflowKeeper', () => {
	const workflowService = mock<WorkflowService>();
	const temporaryWorkflows = mock<AiBuilderTemporaryWorkflowRepository>();
	const provenance = mock<WorkflowProvenanceService>();
	const writeAccess = mock<InstanceWriteAccessService>();
	const keeper = new AutomationWorkflowKeeper(
		workflowService,
		temporaryWorkflows,
		provenance,
		writeAccess,
	);
	let calls: string[];

	beforeEach(() => {
		vi.resetAllMocks();
		calls = [];
		writeAccess.isReadOnly.mockReturnValue(false);
		temporaryWorkflows.findThreadIdForWorkflow.mockResolvedValue('thread-1');
		workflowService.unarchive.mockImplementation(async (_user, id) => {
			calls.push('unarchive');
			return { id, versionId: 'v-restored' } as WorkflowEntity;
		});
		provenance.record.mockImplementation(async () => {
			calls.push('record');
		});
		temporaryWorkflows.unmark.mockImplementation(async () => {
			calls.push('unmark');
		});
	});

	it('changes nothing for a workflow that is already kept', async () => {
		temporaryWorkflows.existsForWorkflow.mockResolvedValue(false);
		writeAccess.isReadOnly.mockReturnValue(true);

		await expect(keeper.keep(user, workflow())).resolves.toBe('v-1');

		expect(calls).toEqual([]);
	});

	it('records the chat that built a temporary workflow, then removes its marker', async () => {
		temporaryWorkflows.existsForWorkflow.mockResolvedValue(true);

		await expect(keeper.keep(user, workflow())).resolves.toBe('v-1');

		expect(temporaryWorkflows.existsForWorkflow).toHaveBeenCalledWith('wf-1');
		expect(temporaryWorkflows.findThreadIdForWorkflow).toHaveBeenCalledWith('wf-1');
		expect(provenance.record).toHaveBeenCalledWith('wf-1', 'thread-1', 'user-1');
		expect(temporaryWorkflows.unmark).toHaveBeenCalledWith('wf-1');
		expect(calls).toEqual(['record', 'unmark']);
	});

	it('removes the marker without a record when the marker names no chat', async () => {
		temporaryWorkflows.existsForWorkflow.mockResolvedValue(true);
		temporaryWorkflows.findThreadIdForWorkflow.mockResolvedValue(null);

		await keeper.keep(user, workflow());

		expect(calls).toEqual(['unmark']);
	});

	it('restores an archived workflow as the user and returns the restored version', async () => {
		temporaryWorkflows.existsForWorkflow.mockResolvedValue(false);

		await expect(keeper.keep(user, workflow({ isArchived: true }))).resolves.toBe('v-restored');

		expect(workflowService.unarchive).toHaveBeenCalledWith(user, 'wf-1');
		expect(calls).toEqual(['unarchive']);
	});

	it('restores an archived temporary workflow before it removes the marker', async () => {
		temporaryWorkflows.existsForWorkflow.mockResolvedValue(true);

		await expect(keeper.keep(user, workflow({ isArchived: true }))).resolves.toBe('v-restored');

		expect(calls).toEqual(['unarchive', 'record', 'unmark']);
	});

	it('stops with a clear error when the user cannot restore the workflow', async () => {
		temporaryWorkflows.existsForWorkflow.mockResolvedValue(true);
		workflowService.unarchive.mockResolvedValue(undefined);

		const result = keeper.keep(user, workflow({ isArchived: true }));

		await expect(result).rejects.toThrow(UserError);
		await expect(result).rejects.toThrow(
			'You do not have permission to restore "Digest builder". Nothing was changed.',
		);
		expect(provenance.record).not.toHaveBeenCalled();
		expect(temporaryWorkflows.unmark).not.toHaveBeenCalled();
	});

	it('refuses to keep a workflow on a read-only instance and changes nothing', async () => {
		temporaryWorkflows.existsForWorkflow.mockResolvedValue(true);
		writeAccess.isReadOnly.mockReturnValue(true);

		const result = keeper.keep(user, workflow({ isArchived: true }));

		await expect(result).rejects.toThrow(UserError);
		await expect(result).rejects.toThrow(
			'This n8n instance is read-only, so "Digest builder" cannot be kept. Nothing was changed.',
		);
		expect(calls).toEqual([]);
	});

	it('keeps the marker when the chat cannot be recorded', async () => {
		temporaryWorkflows.existsForWorkflow.mockResolvedValue(true);
		provenance.record.mockRejectedValue(new Error('database is down'));

		await expect(keeper.keep(user, workflow())).rejects.toThrow('database is down');

		expect(temporaryWorkflows.unmark).not.toHaveBeenCalled();
	});
});
