import type { WorkflowActivated } from '@n8n/api-types/push/workflow';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useBannersStore } from '@/features/shared/banners/banners.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useCanvasOperations } from '@/app/composables/useCanvasOperations';

export async function workflowActivated({ data }: WorkflowActivated) {
	const { initializeWorkspace } = useCanvasOperations();
	const workflowsStore = useWorkflowsStore();
	const workflowsListStore = useWorkflowsListStore();
	const bannersStore = useBannersStore();
	const uiStore = useUIStore();

	const { workflowId, activeVersionId } = data;

	const workflowIsBeingViewed = workflowsStore.workflowId === workflowId;
	const activeVersionIsSet = workflowsStore.workflow.activeVersionId !== activeVersionId;
	if (workflowIsBeingViewed && activeVersionIsSet) {
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
