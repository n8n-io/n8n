import type { NodeExecuteBefore } from '@n8n/api-types/push/execution';
import type { WorkflowState } from '@/app/composables/useWorkflowState';
import { useExecutionDataStore } from '@/app/stores/executionData.store';

/**
 * Handles the 'nodeExecuteBefore' event, which happens before a node is executed.
 */
export async function nodeExecuteBefore(
	{ data }: NodeExecuteBefore,
	{ workflowState }: { workflowState: WorkflowState },
) {
	workflowState.executingNode.addExecutingNode(data.nodeName);
	useExecutionDataStore(data.executionId).addNodeExecutionStartedData(data);
}
