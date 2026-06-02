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

	workflowExecutionStateStore.executingNode.addExecutingNode(data.nodeName);

	const activeExecutionId = workflowExecutionStateStore.activeExecutionId;
	if (typeof activeExecutionId === 'string') {
		useExecutionDataStore(createExecutionDataId(activeExecutionId)).addNodeExecutionStartedData(
			data,
		);
	}
}
