import type { NodeExecuteBefore } from '@n8n/api-types/push/execution';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	createWorkflowExecutionStateId,
	useWorkflowExecutionStateStore,
} from '@/app/stores/workflowExecutionState.store';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';

/**
 * Handles the 'nodeExecuteBefore' event, which happens before a node is executed.
 */
export async function nodeExecuteBefore({ data }: NodeExecuteBefore) {
	const workflowsStore = useWorkflowsStore();
	const workflowExecutionStateStore = useWorkflowExecutionStateStore(
		createWorkflowExecutionStateId(workflowsStore.workflowId),
	);

	workflowExecutionStateStore.addExecutingNode(data.nodeName);

	const activeExecutionId = workflowExecutionStateStore.activeExecutionId;
	if (typeof activeExecutionId === 'string') {
		useExecutionDataStore(createExecutionDataId(activeExecutionId)).addNodeExecutionStartedData(
			data,
		);
	}
}
