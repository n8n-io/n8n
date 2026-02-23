import type { WorkflowAutoDeactivated } from '@n8n/api-types/push/workflow';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useBannersStore } from '@/features/shared/banners/banners.store';

export async function workflowAutoDeactivated({ data }: WorkflowAutoDeactivated) {
	const workflowsStore = useWorkflowsStore();
	const bannersStore = useBannersStore();

	workflowsStore.setWorkflowInactive(data.workflowId);

	if (workflowsStore.workflowId === data.workflowId) {
		bannersStore.pushBannerToStack('WORKFLOW_AUTO_DEACTIVATED');
	}
}
