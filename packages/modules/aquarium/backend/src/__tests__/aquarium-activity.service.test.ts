import type { WorkflowSharingService } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import type { WorkflowExecuteAfterContext, WorkflowExecuteBeforeContext } from '@n8n/decorators';
import { mock } from 'vitest-mock-extended';

import { AquariumActivityService } from '../aquarium-activity.service';

const user = mock<User>({ id: 'user-1' });

function before(workflowId: string, executionId: string) {
	return mock<WorkflowExecuteBeforeContext>({ workflow: { id: workflowId }, executionId });
}

function after(workflowId: string, executionId: string, status: 'success' | 'error') {
	return mock<WorkflowExecuteAfterContext>({
		workflow: { id: workflowId },
		executionId,
		runData: { status },
	});
}

describe('AquariumActivityService', () => {
	let sharing: ReturnType<typeof mock<WorkflowSharingService>>;
	let service: AquariumActivityService;

	beforeEach(() => {
		sharing = mock<WorkflowSharingService>();
		sharing.getSharedWorkflowIds.mockResolvedValue(['readable']);
		service = new AquariumActivityService(sharing);
	});

	it('returns only the workflows that the user can read', async () => {
		service.onWorkflowExecuteBefore(before('readable', 'e1'));
		service.onWorkflowExecuteBefore(before('secret', 'e2'));

		const activity = await service.getActivity(user);

		expect(activity.workflows.map((w) => w.workflowId)).toEqual(['readable']);
		expect(sharing.getSharedWorkflowIds).toHaveBeenCalledWith(user, { scopes: ['workflow:read'] });
	});

	it('records the end of a run', async () => {
		service.onWorkflowExecuteBefore(before('readable', 'e1'));
		service.onWorkflowExecuteAfter(after('readable', 'e1', 'error'));

		const [workflow] = (await service.getActivity(user)).workflows;

		expect(workflow).toMatchObject({ running: 0, started: 1, failed: 1 });
	});

	it('does not query permissions when nothing ran', async () => {
		const activity = await service.getActivity(user);

		expect(activity.workflows).toEqual([]);
		expect(sharing.getSharedWorkflowIds).not.toHaveBeenCalled();
	});

	it('caches the readable workflows of a user for a short time', async () => {
		service.onWorkflowExecuteBefore(before('readable', 'e1'));
		const now = Date.now();

		await service.getActivity(user, now);
		await service.getActivity(user, now + 1_000);
		expect(sharing.getSharedWorkflowIds).toHaveBeenCalledTimes(1);

		await service.getActivity(user, now + 60_000);
		expect(sharing.getSharedWorkflowIds).toHaveBeenCalledTimes(2);
	});
});
