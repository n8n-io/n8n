import type { TestWebhookReceived } from '@n8n/api-types/push/webhook';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import type { PushHandlerOptions } from './types';

/**
 * Handles the 'testWebhookReceived' push message, which is sent when a test webhook is received.
 */
export async function testWebhookReceived(
	{ data }: TestWebhookReceived,
	{ documentId }: PushHandlerOptions,
) {
	const workflowExecutionStateStore = useWorkflowExecutionStateStore(documentId);

	if (data.workflowId === workflowExecutionStateStore.workflowId) {
		workflowExecutionStateStore.setExecutionWaitingForWebhook(false);
		workflowExecutionStateStore.setActiveExecutionId(data.executionId ?? null);
	}
}
