import type { WorkflowFailedToActivate } from '@n8n/api-types/push/workflow';
import { useToast } from '@/app/composables/useToast';
import { useActivationError } from '@/app/composables/useActivationError';
import { useI18n } from '@n8n/i18n';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import type { PushHandlerOptions } from './types';

export async function workflowFailedToActivate(
	{ data }: WorkflowFailedToActivate,
	{ documentId }: PushHandlerOptions,
) {
	const workflowsStore = useWorkflowsStore();
	const workflowDocumentStore = useWorkflowDocumentStore(documentId);

	if (workflowDocumentStore.workflowId !== data.workflowId) {
		return;
	}

	workflowsStore.setWorkflowInactive(data.workflowId);
	workflowDocumentStore.setActiveState({ activeVersionId: null, activeVersion: null });

	const toast = useToast();
	const i18n = useI18n();
	const { errorMessage } = useActivationError(() => data.nodeId);
	const title = i18n.baseText('workflowActivator.showError.title', {
		interpolate: { newStateName: 'activated' },
	});
	toast.showError(new Error(data.errorMessage), title, {
		message: errorMessage.value,
		description: data.errorDescription,
	});
}
