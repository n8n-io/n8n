import type { WorkflowFailedToActivate } from '@n8n/api-types/push/workflow';
import { useToast } from '@/composables/useToast';
import type { WorkflowState } from '@/composables/useWorkflowState';
import { useI18n } from '@n8n/i18n';
import { useWorkflowsStore } from '@/stores/workflows.store';

export async function workflowFailedToActivate(
	{ data }: WorkflowFailedToActivate,
	options: { workflowState: WorkflowState },
) {
	const workflowsStore = useWorkflowsStore();

	if (workflowsStore.workflowId !== data.workflowId) {
		return;
	}

	workflowsStore.setWorkflowInactive(data.workflowId);
	options.workflowState.setActive(false);

	const toast = useToast();
	const i18n = useI18n();
	toast.showError(
		new Error(data.errorMessage),
		i18n.baseText('workflowActivator.showError.title', {
			interpolate: { newStateName: 'activated' },
		}) + ':',
	);
}
