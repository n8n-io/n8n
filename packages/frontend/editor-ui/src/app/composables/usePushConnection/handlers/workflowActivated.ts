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

	if (workflowsStore.workflow.activeVersionId !== data.activeVersionId) {
		const activeVersion = await getWorkflowVersion(
			rootStore.restApiContext,
			data.workflowId,
			data.activeVersionId,
		);

		workflowsStore.setWorkflowActive(data.workflowId, activeVersion);
	}

	// Remove auto-deactivated banner and update checksum if viewing this workflow
	if (workflowsStore.workflowId === data.workflowId) {
		// Only update checksum if there are no unsaved changes
		if (!uiStore.stateIsDirty) {
			await workflowsStore.fetchAndUpdateWorkflowChecksum(data.workflowId);
		}
		bannersStore.removeBannerFromStack('WORKFLOW_AUTO_DEACTIVATED');
	}
}
