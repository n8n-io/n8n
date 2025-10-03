import type { TestWebhookReceived } from '@n8n/api-types/push/webhook';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { WorkflowState } from '@/composables/useWorkflowState';

/**
 * Handles the 'testWebhookReceived' push message, which is sent when a test webhook is received.
 */
export async function testWebhookReceived(
	{ data }: TestWebhookReceived,
	options: { workflowState: WorkflowState },
) {
	const workflowsStore = useWorkflowsStore();

	if (data.workflowId === workflowsStore.workflowId) {
		workflowsStore.executionWaitingForWebhook = false;
		options.workflowState.setActiveExecutionId(data.executionId ?? null);
	}
}
