import type { WorkflowAutoDeactivated } from '@n8n/api-types/push/workflow';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useBannersStore } from '@/features/shared/banners/banners.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useCanvasOperations } from '@/app/composables/useCanvasOperations';

export function useWorkflowAutoDeactivated() {
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const { initializeWorkspace } = useCanvasOperations();
	const workflowsStore = useWorkflowsStore();
	const workflowsListStore = useWorkflowsListStore();
	const bannersStore = useBannersStore();
	const uiStore = useUIStore();

	async function workflowAutoDeactivated({ data }: WorkflowAutoDeactivated) {
		workflowsStore.setWorkflowInactive(data.workflowId);

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
			workflowDocumentStore.value.setActiveState({
				activeVersionId: null,
				activeVersion: null,
			});
		}

		bannersStore.pushBannerToStack('WORKFLOW_AUTO_DEACTIVATED');
	}

	return { workflowAutoDeactivated };
}
