import type { TestWebhookDeleted } from '@n8n/api-types/push/webhook';
import { getCurrentWorkflowId } from '@/app/composables/useWorkflowId';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { createWorkflowDocumentId } from '@/app/stores/workflowDocument.store';
import type { WorkflowState } from '@/app/composables/useWorkflowState';

/**
 * Handles the 'testWebhookDeleted' push message, which is sent when a test webhook is deleted.
 */
export async function testWebhookDeleted(
	{ data }: TestWebhookDeleted,
	options: { workflowState: WorkflowState },
) {
	const workflowId = getCurrentWorkflowId();

	if (data.workflowId === workflowId) {
		useWorkflowExecutionStateStore(
			createWorkflowDocumentId(workflowId),
		).setExecutionWaitingForWebhook(false);
		options.workflowState.setActiveExecutionId(undefined);
	}
}
