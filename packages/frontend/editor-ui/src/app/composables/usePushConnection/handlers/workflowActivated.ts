import type { WorkflowActivated } from '@n8n/api-types/push/workflow';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useBannersStore } from '@/features/shared/banners/banners.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useCanvasOperations } from '@/app/composables/useCanvasOperations';

export function useWorkflowActivated() {
	const { initializeWorkspace } = useCanvasOperations();
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const workflowsListStore = useWorkflowsListStore();
	const bannersStore = useBannersStore();
	const uiStore = useUIStore();

	async function workflowActivated({ data }: WorkflowActivated) {
		const { workflowId, activeVersionId } = data;

		if (workflowDocumentStore.value.workflowId !== workflowId) {
			return;
		}

		const activeVersionChanged = workflowDocumentStore?.value?.activeVersionId !== activeVersionId;

		if (activeVersionChanged) {
			if (!uiStore.stateIsDirty) {
				const updatedWorkflow = await workflowsListStore.fetchWorkflow(workflowId);
				if (!updatedWorkflow.checksum) {
					throw new Error('Failed to fetch workflow');
				}
				await initializeWorkspace(updatedWorkflow);
			}
		}

		bannersStore.removeBannerFromStack('WORKFLOW_AUTO_DEACTIVATED');
	}

	return { workflowActivated };
}
