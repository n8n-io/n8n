import type { WorkflowFailedToActivate } from '@n8n/api-types/push/workflow';
import { useToast } from '@/app/composables/useToast';
import type { WorkflowState } from '@/app/composables/useWorkflowState';
import { useI18n } from '@n8n/i18n';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';

export async function workflowFailedToActivate(
	{ data }: WorkflowFailedToActivate,
	_options: { workflowState: WorkflowState },
) {
	const workflowsStore = useWorkflowsStore();
	const documentStore = injectWorkflowDocumentStore();

	if (workflowsStore.workflowId !== data.workflowId) {
		return;
	}

	workflowsStore.setWorkflowInactive(data.workflowId);
	documentStore?.value?.setActiveState({ activeVersionId: null, activeVersion: null });

	const toast = useToast();
	const i18n = useI18n();
	toast.showError(
		new Error(data.errorMessage),
		i18n.baseText('workflowActivator.showError.title', {
			interpolate: { newStateName: 'activated' },
		}) + ':',
	);
}
