import type { WorkflowDeactivated } from '@n8n/api-types/push/workflow';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useUIStore } from '@/app/stores/ui.store';

export async function workflowDeactivated({ data }: WorkflowDeactivated) {
	const workflowsStore = useWorkflowsStore();
	const uiStore = useUIStore();

	if (workflowsStore.workflowId === data.workflowId) {
		// Only update workflow if there are no unsaved changes
		if (!uiStore.stateIsDirty) {
			const updatedWorkflow = await workflowsStore.fetchWorkflow(data.workflowId);
			if (!updatedWorkflow.checksum) {
				throw new Error('Failed to fetch workflow');
			}
			workflowsStore.setWorkflow(updatedWorkflow);
		}
	}
}
