import type { TestWebhookReceived } from '@n8n/api-types/push/webhook';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { createWorkflowDocumentId } from '@/app/stores/workflowDocument.store';

/**
 * Handles the 'testWebhookReceived' push message, which is sent when a test webhook is received.
 */
export async function testWebhookReceived({ data }: TestWebhookReceived) {
	const workflowsStore = useWorkflowsStore();

	if (data.workflowId === workflowsStore.workflowId) {
		const workflowExecutionStateStore = useWorkflowExecutionStateStore(
			createWorkflowDocumentId(workflowsStore.workflowId),
		);
		workflowExecutionStateStore.setExecutionWaitingForWebhook(false);
		workflowExecutionStateStore.setActiveExecutionId(data.executionId ?? null);
	}
}
