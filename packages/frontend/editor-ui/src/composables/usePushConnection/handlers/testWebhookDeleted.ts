import type { TestWebhookDeleted } from '@n8n/api-types/push/webhook';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useRunDataStore } from '@n8n/stores/useRunDataStore';

/**
 * Handles the 'testWebhookDeleted' push message, which is sent when a test webhook is deleted.
 */
export async function testWebhookDeleted({ data }: TestWebhookDeleted) {
	const workflowsStore = useWorkflowsStore();
	const runDataStore = useRunDataStore();

	if (data.workflowId === workflowsStore.workflowId) {
		workflowsStore.executionWaitingForWebhook = false;
		runDataStore.setActiveExecutionId(undefined);
	}
}
