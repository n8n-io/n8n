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

/**
 * Re-fetches an execution from the server and reconciles this document's canvas
 * state to that server truth: renders the final run data and clears the
 * running/spinner state via `setRunExecutionData`.
 *
 * Shared by the `executionRecovered` push handler (server-side crash recovery
 * on startup) and the push-reconnect reconciliation path (an execution that
 * finished while the client was disconnected, so its `executionFinished` push
 * was never delivered). Callers are responsible for confirming that
 * `executionId` is the run this document should reconcile.
 */
export async function reconcileFinishedExecution(executionId: string, options: PushHandlerOptions) {
	const { documentId, suppressExecutionSuccessToasts, suppressExecutionErrorToasts } = options;
	const uiStore = useUIStore();

	uiStore.setProcessingExecutionResults(true);

	const execution = await fetchExecutionData(executionId, documentId);
	if (!execution) {
		uiStore.setProcessingExecutionResults(false);
		return;
	}

	const runExecutionData = getRunExecutionData(execution);
	uiStore.setProcessingExecutionResults(false);

	if (execution.data?.waitTill !== undefined) {
		handleExecutionFinishedWithWaitTill(execution.workflowId ?? '', options);
	} else if (execution.status === 'error' || execution.status === 'canceled') {
		handleExecutionFinishedWithErrorOrCanceled(
			execution,
			runExecutionData,
			documentId,
			suppressExecutionErrorToasts,
		);
	} else {
		handleExecutionFinishedWithSuccessOrOther(
			documentId,
			execution.status,
			false,
			suppressExecutionSuccessToasts,
		);
	}

	setRunExecutionData(execution, runExecutionData, documentId);
}

export async function executionRecovered(
	{ data }: ExecutionRecovered,
	options: PushHandlerOptions,
) {
	const workflowExecutionStateStore = useWorkflowExecutionStateStore(options.documentId);

	// Only recover the execution this document is tracking. A mismatch (including
	// the no-active-execution case, where activeExecutionId is undefined) means
	// the event belongs to another execution and must be ignored.
	if (workflowExecutionStateStore.activeExecutionId !== data.executionId) {
		return;
	}

	await reconcileFinishedExecution(data.executionId, options);
}
