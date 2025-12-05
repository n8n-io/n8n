import type { WorkflowDeactivated } from '@n8n/api-types/push/workflow';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useUIStore } from '@/app/stores/ui.store';

export async function workflowDeactivated({ data }: WorkflowDeactivated) {
	const workflowsStore = useWorkflowsStore();
	const uiStore = useUIStore();

	workflowsStore.setWorkflowInactive(data.workflowId);

	if (workflowsStore.workflowId === data.workflowId) {
		// Only update checksum if there are no unsaved changes
		if (!uiStore.stateIsDirty) {
			await workflowsStore.updateWorkflowChecksum();
		}
	}
}
