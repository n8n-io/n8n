import type { TestWebhookDeleted } from '@n8n/api-types/push/webhook';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import type { PushHandlerOptions } from './types';

/**
 * Handles the 'testWebhookDeleted' push message, which is sent when a test webhook is deleted.
 */
export async function testWebhookDeleted(
	{ data }: TestWebhookDeleted,
	{ documentId }: PushHandlerOptions,
) {
	const workflowExecutionStateStore = useWorkflowExecutionStateStore(documentId);

	if (data.workflowId === workflowExecutionStateStore.workflowId) {
		workflowExecutionStateStore.setExecutionWaitingForWebhook(false);
		workflowExecutionStateStore.setActiveExecutionId(undefined);
	}
}
