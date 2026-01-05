import type { WorkflowAutoDeactivated } from '@n8n/api-types/push/workflow';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useBannersStore } from '@/features/shared/banners/banners.store';
import { useUIStore } from '@/app/stores/ui.store';

export async function workflowAutoDeactivated({ data }: WorkflowAutoDeactivated) {
	const workflowsStore = useWorkflowsStore();
	const bannersStore = useBannersStore();
	const uiStore = useUIStore();

	workflowsStore.setWorkflowInactive(data.workflowId);

	if (workflowsStore.workflowId === data.workflowId) {
		// Only update workflow if there are no unsaved changes
		if (!uiStore.stateIsDirty) {
			const updatedWorkflow = await workflowsStore.fetchWorkflow(data.workflowId);
			if (!updatedWorkflow.checksum) {
				throw new Error('Failed to fetch workflow');
			}
			workflowsStore.setWorkflow(updatedWorkflow);
		}

		bannersStore.pushBannerToStack('WORKFLOW_AUTO_DEACTIVATED');
	}
}
