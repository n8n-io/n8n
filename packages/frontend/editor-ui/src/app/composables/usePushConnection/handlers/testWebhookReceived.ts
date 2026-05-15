import type { TestWebhookReceived } from '@n8n/api-types/push/webhook';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { injectWorkflowState } from '@/app/composables/useWorkflowState';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';

/**
 * Handles the 'testWebhookReceived' push message, which is sent when a test webhook is received.
 */
export function useTestWebhookReceived() {
	const workflowsStore = useWorkflowsStore();
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const workflowState = injectWorkflowState();

	async function testWebhookReceived({ data }: TestWebhookReceived) {
		if (data.workflowId === workflowDocumentStore.value.workflowId) {
			workflowsStore.setExecutionWaitingForWebhook(false);
			workflowState.setActiveExecutionId(data.executionId ?? null);
		}
	}

	return { testWebhookReceived };
}
