import type { NodeExecuteBefore } from '@n8n/api-types/push/execution';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	createWorkflowExecutionStateId,
	useWorkflowExecutionStateStore,
} from '@/app/stores/workflowExecutionState.store';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import type { WorkflowState } from '@/app/composables/useWorkflowState';

/**
 * Handles the 'nodeExecuteBefore' event, which happens before a node is executed.
 */
export async function nodeExecuteBefore(
	{ data }: NodeExecuteBefore,
	{ workflowState }: { workflowState: WorkflowState },
) {
	const workflowsStore = useWorkflowsStore();
	const stateStore = useWorkflowExecutionStateStore(
		createWorkflowExecutionStateId(workflowsStore.workflowId),
	);

	workflowState.executingNode.addExecutingNode(data.nodeName);

	const activeExecutionId = stateStore.activeExecutionId;
	if (typeof activeExecutionId === 'string') {
		useExecutionDataStore(createExecutionDataId(activeExecutionId)).addNodeExecutionStartedData(
			data,
		);
	}
}
