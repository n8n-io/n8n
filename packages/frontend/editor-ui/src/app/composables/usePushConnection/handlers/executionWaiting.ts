import type { ExecutionWaiting } from '@n8n/api-types/push/execution';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import type { PushHandlerOptions } from './types';

export async function executionWaiting(
	{ data }: ExecutionWaiting,
	{ documentId }: PushHandlerOptions,
) {
	const workflowExecutionStateStore = useWorkflowExecutionStateStore(documentId);
	if (workflowExecutionStateStore.activeExecutionId !== data.executionId) {
		return;
	}

	workflowExecutionStateStore.executingNode.clearNodeExecutionQueue();

	const executionDataStore = useExecutionDataStore(createExecutionDataId(data.executionId));
	const execution = executionDataStore.getExecutionSnapshot();
	if (!execution) {
		return;
	}

	executionDataStore.setExecution(
		{ ...execution, status: 'waiting' },
		{ stripWaitingTaskData: false },
	);
}
