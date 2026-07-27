import type { NodeExecuteBefore } from '@n8n/api-types/push/execution';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import type { PushHandlerOptions } from './types';

/**
 * Handles the 'nodeExecuteBefore' event, which happens before a node is executed.
 */
export async function nodeExecuteBefore(
	{ data }: NodeExecuteBefore,
	{ documentId }: PushHandlerOptions,
) {
	const workflowExecutionStateStore = useWorkflowExecutionStateStore(documentId);

	// Ignore node events that don't belong to the execution this document is
	// tracking, or to one of its sub-executions — otherwise a concurrent
	// execution's node would pollute this document's spinner queue and execution
	// data.
	const activeExecutionId = workflowExecutionStateStore.activeExecutionId;
	const isSubExecution = workflowExecutionStateStore.isTrackedSubExecution(data.executionId);
	if (activeExecutionId !== data.executionId && !isSubExecution) {
		return;
	}

	// A sub-execution advances its own queue: the node that started it stays
	// running until it returns, and the two executions number their node events
	// independently.
	const queue = isSubExecution
		? workflowExecutionStateStore.subExecutingNode
		: workflowExecutionStateStore.executingNode;
	queue.addExecutingNode(data.nodeName, data.sequenceNumber);

	useExecutionDataStore(createExecutionDataId(data.executionId)).addNodeExecutionStartedData(data);
}
