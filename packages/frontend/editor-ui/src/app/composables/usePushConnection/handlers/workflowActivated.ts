import type { WorkflowActivated } from '@n8n/api-types/push/workflow';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useBannersStore } from '@/features/shared/banners/banners.store';
import { useUIStore } from '@/app/stores/ui.store';
import { getWorkflowVersion } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';

export async function workflowActivated({ data }: WorkflowActivated) {
	const workflowsStore = useWorkflowsStore();
	const bannersStore = useBannersStore();
	const rootStore = useRootStore();
	const uiStore = useUIStore();

	const { workflowId, activeVersionId } = data;

	const cachedWorkflow = workflowsStore.getWorkflowById(workflowId);
	const workflowIsBeingViewed = workflowsStore.workflowId === workflowId;
	if (
		(workflowIsBeingViewed && workflowsStore.workflow.activeVersionId !== activeVersionId) ||
		cachedWorkflow
	) {
		const activeVersion = await getWorkflowVersion(
			rootStore.restApiContext,
			workflowId,
			activeVersionId,
		);

		workflowsStore.setWorkflowActive(workflowId, activeVersion, false);
	}

	// Remove auto-deactivated banner and update checksum if viewing this workflow
	if (workflowIsBeingViewed) {
		// Only update checksum if there are no unsaved changes
		if (!uiStore.stateIsDirty) {
			await workflowsStore.fetchAndUpdateWorkflowChecksum(workflowId);
		}
		bannersStore.removeBannerFromStack('WORKFLOW_AUTO_DEACTIVATED');
	}
}
