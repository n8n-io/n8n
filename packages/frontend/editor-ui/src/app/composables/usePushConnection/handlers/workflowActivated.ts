import type { WorkflowActivated } from '@n8n/api-types/push/workflow';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useBannersStore } from '@/features/shared/banners/banners.store';

export async function workflowActivated({ data }: WorkflowActivated) {
	const workflowsStore = useWorkflowsStore();
	const bannersStore = useBannersStore();

	workflowsStore.setWorkflowActive(data.workflowId);

	// Remove auto-deactivated banner if viewing this workflow
	if (workflowsStore.workflowId === data.workflowId) {
		bannersStore.removeBannerFromStack('WORKFLOW_AUTO_DEACTIVATED');
	}
}
