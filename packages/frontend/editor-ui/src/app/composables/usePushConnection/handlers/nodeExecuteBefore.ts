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

	// Ignore events for anything but the tracked execution or its sub-executions,
	// so a concurrent run can't pollute this document's queue and data.
	const activeExecutionId = workflowExecutionStateStore.activeExecutionId;
	const isSubExecution = workflowExecutionStateStore.isTrackedSubExecution(data.executionId);
	if (activeExecutionId !== data.executionId && !isSubExecution) {
		return;
	}

	// A sub-execution advances its own queue: the calling node stays running until
	// it returns, and the two number their events independently.
	const queue = isSubExecution
		? workflowExecutionStateStore.subExecutingNode
		: workflowExecutionStateStore.executingNode;
	queue.addExecutingNode(data.nodeName, data.sequenceNumber);

	useExecutionDataStore(createExecutionDataId(data.executionId)).addNodeExecutionStartedData(data);
}
