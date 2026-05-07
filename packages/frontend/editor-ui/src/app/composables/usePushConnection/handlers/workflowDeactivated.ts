import type { ComputedRef } from 'vue';
import type { WorkflowDeactivated } from '@n8n/api-types/push/workflow';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useCanvasOperations } from '@/app/composables/useCanvasOperations';

export async function workflowDeactivated(
	{ data }: WorkflowDeactivated,
	options: { workflowId: ComputedRef<string> },
) {
	const { initializeWorkspace } = useCanvasOperations(options.workflowId);
	const workflowsListStore = useWorkflowsListStore();
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const uiStore = useUIStore();

	if (options.workflowId.value === data.workflowId) {
		// Only update workflow if there are no unsaved changes
		if (!uiStore.stateIsDirty) {
			const updatedWorkflow = await workflowsListStore.fetchWorkflow(data.workflowId);
			if (!updatedWorkflow.checksum) {
				throw new Error('Failed to fetch workflow');
			}
			// initializeWorkspace calls initState which sets the document store
			await initializeWorkspace(updatedWorkflow);
		} else {
			workflowDocumentStore?.value?.setActiveState({ activeVersionId: null, activeVersion: null });
		}
	}
}
