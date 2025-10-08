import type { NodeExecuteBefore } from '@n8n/api-types/push/execution';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { WorkflowState } from '@/composables/useWorkflowState';

/**
 * Handles the 'nodeExecuteBefore' event, which happens before a node is executed.
 */
export async function nodeExecuteBefore(
	{ data }: NodeExecuteBefore,
	{ workflowState }: { workflowState: WorkflowState },
) {
	const workflowsStore = useWorkflowsStore();

	workflowState.executingNode.addExecutingNode(data.nodeName);
	workflowsStore.addNodeExecutionStartedData(data);
}
