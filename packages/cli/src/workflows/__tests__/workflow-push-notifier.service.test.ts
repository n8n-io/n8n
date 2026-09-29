import { mock } from 'vitest-mock-extended';

import type { Push } from '@/push';
import { WorkflowPushNotifier } from '@/workflows/workflow-push-notifier.service';
import type { WorkflowSharingService } from '@/workflows/workflow-sharing.service';

describe('WorkflowPushNotifier', () => {
	const push = mock<Push>();
	const workflowSharingService = mock<WorkflowSharingService>();
	const notifier = new WorkflowPushNotifier(push, workflowSharingService);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	test('sends the push message only to users with access to the workflow', async () => {
		workflowSharingService.getUserIdsWithAccessToWorkflowSafe.mockResolvedValue([
			'user-1',
			'user-2',
		]);

		const pushMsg = {
			type: 'workflowActivated' as const,
			data: { workflowId: 'wf-1', activeVersionId: 'v-1' },
		};

		await notifier.notify('wf-1', pushMsg);

		expect(workflowSharingService.getUserIdsWithAccessToWorkflowSafe).toHaveBeenCalledWith('wf-1');
		expect(push.sendToUsers).toHaveBeenCalledWith(pushMsg, ['user-1', 'user-2']);
	});

	test('sends to nobody when the recipient lookup resolves to no users', async () => {
		workflowSharingService.getUserIdsWithAccessToWorkflowSafe.mockResolvedValue([]);

		const pushMsg = { type: 'workflowDeactivated' as const, data: { workflowId: 'wf-1' } };

		await notifier.notify('wf-1', pushMsg);

		expect(push.sendToUsers).toHaveBeenCalledWith(pushMsg, []);
	});
});
