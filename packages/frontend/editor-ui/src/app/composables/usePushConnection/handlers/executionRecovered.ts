import type { ExecutionRecovered } from '@n8n/api-types/push/execution';
import { useUIStore } from '@/app/stores/ui.store';
import {
	fetchExecutionData,
	getRunExecutionData,
	handleExecutionFinishedWithSuccessOrOther,
	handleExecutionFinishedWithErrorOrCanceled,
	handleExecutionFinishedWithWaitTill,
	setRunExecutionData,
} from './executionFinished';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import type { PushHandlerOptions } from './types';

export async function executionRecovered(
	{ data }: ExecutionRecovered,
	options: PushHandlerOptions,
) {
	const { documentId } = options;
	const workflowExecutionStateStore = useWorkflowExecutionStateStore(documentId);
	const uiStore = useUIStore();

	// Only recover the execution this document is tracking. A mismatch (including
	// the no-active-execution case, where activeExecutionId is undefined) means
	// the event belongs to another execution and must be ignored.
	if (workflowExecutionStateStore.activeExecutionId !== data.executionId) {
		return;
	}

	uiStore.setProcessingExecutionResults(true);

	const execution = await fetchExecutionData(data.executionId, documentId);
	if (!execution) {
		uiStore.setProcessingExecutionResults(false);
		return;
	}

	const runExecutionData = getRunExecutionData(execution);
	uiStore.setProcessingExecutionResults(false);

	if (execution.data?.waitTill !== undefined) {
		handleExecutionFinishedWithWaitTill(execution.workflowId ?? '', options);
	} else if (execution.status === 'error' || execution.status === 'canceled') {
		handleExecutionFinishedWithErrorOrCanceled(execution, runExecutionData, documentId);
	} else {
		handleExecutionFinishedWithSuccessOrOther(documentId, execution.status, false);
	}

	setRunExecutionData(execution, runExecutionData, documentId);
}
