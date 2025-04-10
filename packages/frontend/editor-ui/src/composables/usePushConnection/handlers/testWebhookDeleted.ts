import type { TestWebhookDeleted } from '@n8n/api-types/push/webhook';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useUIStore } from '@/stores/ui.store';

/**
 * Handles the 'testWebhookDeleted' push message, which is sent when a test webhook is deleted.
 */
export async function testWebhookDeleted({ data }: TestWebhookDeleted) {
	const workflowsStore = useWorkflowsStore();
	const uiStore = useUIStore();

	if (data.workflowId === workflowsStore.workflowId) {
		workflowsStore.executionWaitingForWebhook = false;
		workflowsStore.setActiveExecutionId(undefined);
	}
}
