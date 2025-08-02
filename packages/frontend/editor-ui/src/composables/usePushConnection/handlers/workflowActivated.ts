import type { WorkflowActivated } from '@n8n/api-types/push/workflow';
import { useWorkflowsStore } from '@/stores/workflows.store';

export async function workflowActivated({ data }: WorkflowActivated) {
	const workflowsStore = useWorkflowsStore();

	workflowsStore.setWorkflowActive(data.workflowId);
}
