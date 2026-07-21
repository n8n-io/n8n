import type { WorkflowAutoDeactivated } from '@n8n/api-types/push/workflow';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useBannersStore } from '@/features/shared/banners/banners.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useCanvasOperations } from '@/app/composables/useCanvasOperations';
import type { PushHandlerOptions } from './types';

export async function workflowAutoDeactivated(
	{ data }: WorkflowAutoDeactivated,
	{ documentId }: PushHandlerOptions,
) {
	const workflowsStore = useWorkflowsStore();
	const workflowsListStore = useWorkflowsListStore();
	const workflowDocumentStore = useWorkflowDocumentStore(documentId);
	const { initializeWorkspace } = useCanvasOperations();
	const bannersStore = useBannersStore();
	const uiStore = useUIStore();

	workflowsStore.setWorkflowInactive(data.workflowId);

	if (workflowDocumentStore.workflowId === data.workflowId) {
		const updatedWorkflow = await workflowsListStore.fetchWorkflow(data.workflowId);
		if (!updatedWorkflow.checksum) {
			throw new Error('Failed to fetch workflow');
		}

		if (uiStore.stateIsDirty) {
			// Unsaved changes in the editor: reflect the deactivation locally and refresh the
			// expectedChecksum so the next save doesn't 409, but don't re-hydrate — that would
			// discard the in-progress edits.
			workflowDocumentStore.setActiveState({ activeVersionId: null, activeVersion: null });
			workflowDocumentStore.setChecksum(updatedWorkflow.checksum);
		} else {
			// initializeWorkspace calls initState which sets the document store
			await initializeWorkspace(updatedWorkflow);
		}

		bannersStore.pushBannerToStack('WORKFLOW_AUTO_DEACTIVATED');
	}
}
