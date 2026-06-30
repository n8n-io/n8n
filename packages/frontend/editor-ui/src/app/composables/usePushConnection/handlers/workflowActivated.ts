import type { WorkflowActivated } from '@n8n/api-types/push/workflow';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useBannersStore } from '@/features/shared/banners/banners.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useCanvasOperations } from '@/app/composables/useCanvasOperations';
import type { PushHandlerOptions } from './types';

export async function workflowActivated(
	{ data }: WorkflowActivated,
	{ documentId }: PushHandlerOptions,
) {
	const { initializeWorkspace } = useCanvasOperations();
	const workflowsListStore = useWorkflowsListStore();
	const workflowDocumentStore = useWorkflowDocumentStore(documentId);
	const bannersStore = useBannersStore();
	const uiStore = useUIStore();

	const { workflowId, activeVersionId } = data;

	const workflowIsBeingViewed = workflowDocumentStore.workflowId === workflowId;
	const activeVersionChanged = workflowDocumentStore.activeVersionId !== activeVersionId;
	if (workflowIsBeingViewed && activeVersionChanged) {
		// Only update workflow if there are no unsaved changes
		if (!uiStore.stateIsDirty) {
			const updatedWorkflow = await workflowsListStore.fetchWorkflow(workflowId);
			if (!updatedWorkflow.checksum) {
				throw new Error('Failed to fetch workflow');
			}
			await initializeWorkspace(updatedWorkflow);
		}
	}

	// Remove auto-deactivated banner if viewing this workflow
	if (workflowIsBeingViewed) {
		bannersStore.removeBannerFromStack('WORKFLOW_AUTO_DEACTIVATED');
	}
}
