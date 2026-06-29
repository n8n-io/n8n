import type { WorkflowFailedToActivate } from '@n8n/api-types/push/workflow';
import { useToast } from '@/app/composables/useToast';
import { useActivationError } from '@/app/composables/useActivationError';
import { useI18n } from '@n8n/i18n';
import { useWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import type { PushHandlerOptions } from './types';

export async function workflowFailedToActivate(
	{ data }: WorkflowFailedToActivate,
	{ documentId }: PushHandlerOptions,
) {
	const workflowDocumentStore = useWorkflowDocumentStore(documentId);

	if (workflowDocumentStore.workflowId !== data.workflowId) {
		return;
	}

	// Failed activation is recoverable — preserve the published version and set
	// the lifecycle to 'failed' so the UI can surface the error without clearing
	// the active state.
	workflowDocumentStore.setPublicationStatus({
		status: 'failed',
		failures: data.nodeId
			? [{ nodeId: data.nodeId, nodeName: data.nodeId, errorMessage: data.errorMessage }]
			: [],
	});

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
