import type { WorkflowDeactivated } from '@n8n/api-types/push/workflow';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useCanvasOperations } from '@/app/composables/useCanvasOperations';

export function useWorkflowDeactivated() {
	const { initializeWorkspace } = useCanvasOperations();
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const workflowsListStore = useWorkflowsListStore();
	const uiStore = useUIStore();

	async function workflowDeactivated({ data }: WorkflowDeactivated) {
		if (workflowDocumentStore.value.workflowId !== data.workflowId) {
			return;
		}

		if (!uiStore.stateIsDirty) {
			const updatedWorkflow = await workflowsListStore.fetchWorkflow(data.workflowId);
			if (!updatedWorkflow.checksum) {
				throw new Error('Failed to fetch workflow');
			}
			await initializeWorkspace(updatedWorkflow);
		} else {
			workflowDocumentStore?.value?.setActiveState({
				activeVersionId: null,
				activeVersion: null,
			});
		}
	}

	return { workflowDeactivated };
}
