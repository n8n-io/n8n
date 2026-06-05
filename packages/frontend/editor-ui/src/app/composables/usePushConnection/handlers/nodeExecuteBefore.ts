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
	// tracking — otherwise a concurrent execution's node would pollute this
	// document's spinner queue and execution data.
	const activeExecutionId = workflowExecutionStateStore.activeExecutionId;
	if (activeExecutionId !== data.executionId) {
		return;
	}

	workflowExecutionStateStore.executingNode.addExecutingNode(data.nodeName);

	useExecutionDataStore(createExecutionDataId(data.executionId)).addNodeExecutionStartedData(data);
}
