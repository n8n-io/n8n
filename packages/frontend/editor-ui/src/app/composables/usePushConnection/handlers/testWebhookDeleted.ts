import type { TestWebhookDeleted } from '@n8n/api-types/push/webhook';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { createWorkflowDocumentId } from '@/app/stores/workflowDocument.store';

/**
 * Handles the 'testWebhookDeleted' push message, which is sent when a test webhook is deleted.
 */
export async function testWebhookDeleted({ data }: TestWebhookDeleted) {
	const workflowsStore = useWorkflowsStore();

	if (data.workflowId === workflowsStore.workflowId) {
		const workflowExecutionStateStore = useWorkflowExecutionStateStore(
			createWorkflowDocumentId(workflowsStore.workflowId),
		);
		workflowExecutionStateStore.setExecutionWaitingForWebhook(false);
		workflowExecutionStateStore.setActiveExecutionId(undefined);
	}
}
