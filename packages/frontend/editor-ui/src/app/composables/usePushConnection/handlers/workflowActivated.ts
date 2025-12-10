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

	const workflowIsBeingViewed = workflowsStore.workflowId === workflowId;
	const activeVersionIsSet = workflowsStore.workflow.activeVersionId !== activeVersionId;
	if (workflowIsBeingViewed && activeVersionIsSet) {
		const activeVersion = await getWorkflowVersion(
			rootStore.restApiContext,
			workflowId,
			activeVersionId,
		);

		workflowsStore.setWorkflowActive(workflowId, activeVersion, false);

		// Only update checksum if there are no unsaved changes
		if (!uiStore.stateIsDirty) {
			await workflowsStore.updateWorkflowChecksum();
		}
	}

	// Remove auto-deactivated banner if viewing this workflow
	if (workflowIsBeingViewed) {
		bannersStore.removeBannerFromStack('WORKFLOW_AUTO_DEACTIVATED');
	}
}
