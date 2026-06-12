import type { WorkflowPartiallyActivated } from '@n8n/api-types/push/workflow';
import { useToast } from '@/app/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import type { PushHandlerOptions } from './types';

export async function workflowPartiallyActivated(
	{ data }: WorkflowPartiallyActivated,
	{ documentId }: PushHandlerOptions,
) {
	const workflowDocumentStore = useWorkflowDocumentStore(documentId);

	if (workflowDocumentStore.workflowId !== data.workflowId) {
		return;
	}

	// The workflow stays published with the surviving triggers running, so we do
	// not deactivate it here — we only surface which triggers failed to activate.
	const toast = useToast();
	const i18n = useI18n();

	toast.showError(
		new Error(data.errorMessage),
		i18n.baseText('workflowActivator.showError.partialTitle'),
	);
}
