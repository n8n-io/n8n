import type { WorkflowPartiallyActivated } from '@n8n/api-types/push/workflow';
import { useToast } from '@/app/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useBannersStore } from '@/features/shared/banners/banners.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useCanvasOperations } from '@/app/composables/useCanvasOperations';
import type { PushHandlerOptions } from './types';

export async function workflowPartiallyActivated(
	{ data }: WorkflowPartiallyActivated,
	{ documentId }: PushHandlerOptions,
) {
	const { initializeWorkspace } = useCanvasOperations();
	const workflowsListStore = useWorkflowsListStore();
	const workflowDocumentStore = useWorkflowDocumentStore(documentId);
	const bannersStore = useBannersStore();
	const uiStore = useUIStore();

	const { workflowId, activeVersionId } = data;

	if (workflowDocumentStore.workflowId !== workflowId) {
		return;
	}

	const toast = useToast();
	const i18n = useI18n();
	toast.showError(
		new Error(data.errorMessage),
		i18n.baseText('workflowActivator.showError.partialTitle'),
	);

	const activeVersionChanged = workflowDocumentStore.activeVersionId !== activeVersionId;
	if (activeVersionChanged && !uiStore.stateIsDirty) {
		// Only update workflow if there are no unsaved changes
		const updatedWorkflow = await workflowsListStore.fetchWorkflow(workflowId);
		if (!updatedWorkflow.checksum) {
			throw new Error('Failed to fetch workflow');
		}
		await initializeWorkspace(updatedWorkflow);
	}

	bannersStore.removeBannerFromStack('WORKFLOW_AUTO_DEACTIVATED');
}
