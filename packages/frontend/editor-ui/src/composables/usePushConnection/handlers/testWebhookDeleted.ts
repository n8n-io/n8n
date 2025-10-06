import type { TestWebhookDeleted } from '@n8n/api-types/push/webhook';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { WorkflowState } from '@/composables/useWorkflowState';

/**
 * Handles the 'testWebhookDeleted' push message, which is sent when a test webhook is deleted.
 */
export async function testWebhookDeleted(
	{ data }: TestWebhookDeleted,
	options: { workflowState: WorkflowState },
) {
	const workflowsStore = useWorkflowsStore();

	if (data.workflowId === workflowsStore.workflowId) {
		workflowsStore.executionWaitingForWebhook = false;
		options.workflowState.setActiveExecutionId(undefined);
	}
}
