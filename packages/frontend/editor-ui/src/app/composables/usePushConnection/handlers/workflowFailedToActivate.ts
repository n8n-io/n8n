import type { WorkflowFailedToActivate } from '@n8n/api-types/push/workflow';
import { useToast } from '@/app/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';

export function useWorkflowFailedToActivate() {
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const workflowsStore = useWorkflowsStore();
	const toast = useToast();
	const i18n = useI18n();

	async function workflowFailedToActivate({ data }: WorkflowFailedToActivate) {
		if (workflowDocumentStore.value.workflowId !== data.workflowId) {
			return;
		}

		workflowsStore.setWorkflowInactive(data.workflowId);
		workflowDocumentStore.value.setActiveState({ activeVersionId: null, activeVersion: null });

		const node = data.nodeId ? workflowDocumentStore.value.getNodeById(data.nodeId) : undefined;
		const errorMessage = node
			? i18n.baseText('workflowActivator.showError.nodeError', {
					interpolate: { nodeName: node.name },
				})
			: undefined;

		const title = i18n.baseText('workflowActivator.showError.title', {
			interpolate: { newStateName: 'activated' },
		});
		toast.showError(new Error(data.errorMessage), title, {
			message: errorMessage,
			description: data.errorDescription,
		});
	}

	return { workflowFailedToActivate };
}
