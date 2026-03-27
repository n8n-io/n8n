import type { WorkflowUpdated } from '@n8n/api-types/push/workflow';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useCanvasOperations } from '@/app/composables/useCanvasOperations';

/**
 * Handler for workflowUpdated push event.
 * This is triggered when a workflow is updated externally (e.g., via API)
 * while the workflow editor is open.
 */
export async function workflowUpdated({ data }: WorkflowUpdated) {
	const { initializeWorkspace } = useCanvasOperations();
	const workflowsStore = useWorkflowsStore();
	const workflowsListStore = useWorkflowsListStore();
	const uiStore = useUIStore();

	const { workflowId } = data;

	// Only update if this is the workflow currently being viewed
	const workflowIsBeingViewed = workflowsStore.workflowId === workflowId;
	if (!workflowIsBeingViewed) {
		return;
	}

	// Only update workflow if there are no unsaved changes
	// to avoid overwriting user's work
	if (!uiStore.stateIsDirty) {
		const updatedWorkflow = await workflowsListStore.fetchWorkflow(workflowId);
		if (!updatedWorkflow.checksum) {
			throw new Error('Failed to fetch workflow');
		}
		await initializeWorkspace(updatedWorkflow);
	}
}
