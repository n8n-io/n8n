import type { WorkflowFailedToActivate } from '@n8n/api-types/push/workflow';
import { useToast } from '@/app/composables/useToast';
import type { WorkflowState } from '@/app/composables/useWorkflowState';
import { useI18n } from '@n8n/i18n';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useUIStore } from '@/app/stores/ui.store';
import { WORKFLOW_ACTIVE_MODAL_KEY } from '@/app/constants';
import { rejectActivationConfirmation } from '@/app/composables/useWorkflowActivateConfirmation';

export async function workflowFailedToActivate(
	{ data }: WorkflowFailedToActivate,
	_options: { workflowState: WorkflowState },
) {
	const workflowsStore = useWorkflowsStore();
	const documentStore = injectWorkflowDocumentStore();

	if (workflowsStore.workflowId !== data.workflowId) {
		return;
	}

	// Signal the pending publish flow (if any) that activation failed.
	// The publish flow will handle its own cleanup; when there is no
	// pending publish flow, we handle the error directly below.
	const wasPendingConfirmation = rejectActivationConfirmation(data.workflowId);

	workflowsStore.setWorkflowInactive(data.workflowId);
	documentStore?.value?.setActiveState({ activeVersionId: null, activeVersion: null });

	// Close the "Workflow published" success modal if it was somehow shown
	const uiStore = useUIStore();
	uiStore.closeModal(WORKFLOW_ACTIVE_MODAL_KEY);

	// Only show the error toast if there was no pending publish flow waiting,
	// because the publish modal will handle the error display in that case
	if (!wasPendingConfirmation) {
		const toast = useToast();
		const i18n = useI18n();
		toast.showError(
			new Error(data.errorMessage),
			i18n.baseText('workflowActivator.showError.title', {
				interpolate: { newStateName: 'published' },
			}) + ':',
		);
	}
}
