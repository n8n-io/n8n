import { computed, type ComputedRef } from 'vue';

import { RESPOND_TO_WEBHOOK_NODE_TYPE, WEBHOOK_NODE_TYPE } from '@/app/constants/nodeTypes';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';

/**
 * A workflow looks like it could power a web app when it pairs a Webhook
 * trigger with a Respond to Webhook node — the pattern people already use to
 * serve an HTML response straight from n8n, without the App Builder.
 */
export function useWebAppCandidateWorkflow(): ComputedRef<boolean> {
	const workflowDocumentStore = injectWorkflowDocumentStore();

	return computed(() => {
		const allNodes = workflowDocumentStore.value?.allNodes ?? [];
		const hasWebhookTrigger = allNodes.some((node) => node.type === WEBHOOK_NODE_TYPE);
		const hasRespondToWebhook = allNodes.some((node) => node.type === RESPOND_TO_WEBHOOK_NODE_TYPE);
		return hasWebhookTrigger && hasRespondToWebhook;
	});
}
