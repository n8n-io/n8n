import type { TestWebhookReceived } from '@n8n/api-types/push/webhook';
import { useWorkflowsStore } from '@/stores/workflows.store';

/**
 * Handles the 'testWebhookReceived' push message, which is sent when a test webhook is received.
 */
export async function testWebhookReceived({ data }: TestWebhookReceived) {
	const workflowsStore = useWorkflowsStore();

	if (data.workflowId === workflowsStore.workflowId) {
		workflowsStore.executionWaitingForWebhook = false;
		workflowsStore.setActiveExecutionId(data.executionId ?? null);
	}
}
