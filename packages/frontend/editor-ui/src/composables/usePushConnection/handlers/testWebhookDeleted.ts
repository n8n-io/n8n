import type { TestWebhookDeleted } from '@n8n/api-types/push/webhook';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { WorkflowHandle } from '@/composables/useWorkflowHandle';

/**
 * Handles the 'testWebhookDeleted' push message, which is sent when a test webhook is deleted.
 */
export async function testWebhookDeleted(
	{ data }: TestWebhookDeleted,
	options: { workflowHandle: WorkflowHandle },
) {
	const workflowsStore = useWorkflowsStore();

	if (data.workflowId === workflowsStore.workflowId) {
		workflowsStore.executionWaitingForWebhook = false;
		options.workflowHandle.setActiveExecutionId(undefined);
	}
}
