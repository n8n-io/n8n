// Only DI tokens here. Stubs keep the large import graphs of these services out of the test.
vi.mock('@/workflows/workflow.service', () => ({ WorkflowService: class {} }));
vi.mock('../automation-temporary-marker', () => ({ AutomationTemporaryMarker: class {} }));

import type { InstanceWriteAccessService } from '@n8n/backend-services';
import { User, type WorkflowEntity } from '@n8n/db';
import { UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { WorkflowService } from '@/workflows/workflow.service';

import type { AutomationTemporaryMarker } from '../automation-temporary-marker';
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
	const marker = mock<AutomationTemporaryMarker>();
	const writeAccess = mock<InstanceWriteAccessService>();
	const keeper = new AutomationWorkflowKeeper(workflowService, marker, writeAccess);
	let calls: string[];

	beforeEach(() => {
		vi.resetAllMocks();
		calls = [];
		writeAccess.isReadOnly.mockReturnValue(false);
		workflowService.unarchive.mockImplementation(async (_user, id) => {
			calls.push('unarchive');
			return { id, versionId: 'v-restored' } as WorkflowEntity;
		});
		marker.clear.mockImplementation(async () => {
			calls.push('clear marker');
		});
	});

	it('changes nothing for a workflow that is already kept', async () => {
		marker.isMarked.mockResolvedValue(false);
		writeAccess.isReadOnly.mockReturnValue(true);

		await expect(keeper.keep(user, workflow())).resolves.toBe('v-1');

		expect(marker.isMarked).toHaveBeenCalledWith('wf-1');
		expect(calls).toEqual([]);
	});

	it('clears the marker of a temporary workflow as the user', async () => {
		marker.isMarked.mockResolvedValue(true);

		await expect(keeper.keep(user, workflow())).resolves.toBe('v-1');

		expect(marker.clear).toHaveBeenCalledWith(user, 'wf-1');
		expect(calls).toEqual(['clear marker']);
	});

	it('restores an archived workflow as the user and returns the restored version', async () => {
		marker.isMarked.mockResolvedValue(false);

		await expect(keeper.keep(user, workflow({ isArchived: true }))).resolves.toBe('v-restored');

		expect(workflowService.unarchive).toHaveBeenCalledWith(user, 'wf-1');
		expect(calls).toEqual(['unarchive']);
	});

	it('restores an archived temporary workflow before it clears the marker', async () => {
		marker.isMarked.mockResolvedValue(true);

		await expect(keeper.keep(user, workflow({ isArchived: true }))).resolves.toBe('v-restored');

		expect(calls).toEqual(['unarchive', 'clear marker']);
	});

	it('stops with a clear error when the user cannot restore the workflow', async () => {
		marker.isMarked.mockResolvedValue(true);
		workflowService.unarchive.mockResolvedValue(undefined);

		const result = keeper.keep(user, workflow({ isArchived: true }));

		await expect(result).rejects.toThrow(UserError);
		await expect(result).rejects.toThrow(
			'You do not have permission to restore "Digest builder". Nothing was changed.',
		);
		expect(marker.clear).not.toHaveBeenCalled();
	});

	it('refuses to keep a workflow on a read-only instance and changes nothing', async () => {
		marker.isMarked.mockResolvedValue(true);
		writeAccess.isReadOnly.mockReturnValue(true);

		const result = keeper.keep(user, workflow({ isArchived: true }));

		await expect(result).rejects.toThrow(UserError);
		await expect(result).rejects.toThrow(
			'This n8n instance is read-only, so "Digest builder" cannot be kept. Nothing was changed.',
		);
		expect(calls).toEqual([]);
	});
});
