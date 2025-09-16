import type { TestWebhookReceived } from '@n8n/api-types/push/webhook';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useRunDataStore } from '@n8n/stores/useRunDataStore';

/**
 * Handles the 'testWebhookReceived' push message, which is sent when a test webhook is received.
 */
export async function testWebhookReceived({ data }: TestWebhookReceived) {
	const workflowsStore = useWorkflowsStore();
	const runDataStore = useRunDataStore();

	if (data.workflowId === workflowsStore.workflowId) {
		workflowsStore.executionWaitingForWebhook = false;
		runDataStore.setActiveExecutionId(data.executionId ?? null);
	}
}
