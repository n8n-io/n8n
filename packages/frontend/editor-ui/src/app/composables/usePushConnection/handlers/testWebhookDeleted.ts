import type { TestWebhookDeleted } from '@n8n/api-types/push/webhook';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { injectWorkflowState } from '@/app/composables/useWorkflowState';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';

/**
 * Handles the 'testWebhookDeleted' push message, which is sent when a test webhook is deleted.
 */
export function useTestWebhookDeleted() {
	const workflowsStore = useWorkflowsStore();
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const workflowState = injectWorkflowState();

	async function testWebhookDeleted({ data }: TestWebhookDeleted) {
		if (data.workflowId === workflowDocumentStore.value.workflowId) {
			workflowsStore.setExecutionWaitingForWebhook(false);
			workflowState.setActiveExecutionId(undefined);
		}
	}

	return { testWebhookDeleted };
}
