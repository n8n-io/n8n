import type { NodeExecuteBefore } from '@n8n/api-types/push/execution';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import type { WorkflowState } from '@/app/composables/useWorkflowState';

/**
 * Handles the 'nodeExecuteBefore' event, which happens before a node is executed.
 */
export async function nodeExecuteBefore(
	{ data }: NodeExecuteBefore,
	{ workflowState }: { workflowState: WorkflowState },
) {
	workflowState.executingNode.addExecutingNode(data.nodeName);
	useExecutionDataStore(createExecutionDataId(data.executionId)).addNodeExecutionStartedData(data);
}
