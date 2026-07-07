import type { ExecutionRecovered } from '@n8n/api-types/push/execution';
import { useUIStore } from '@/app/stores/ui.store';
import {
	backfillExecutionDataStore,
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

	// Apply the fetched state without blocking the sequential push event queue —
	// awaiting the fetch here would delay every subsequent push event.
	void applyRecoveredExecutionState(data.executionId, options);
}

/**
 * Fetches the recovered execution and applies its state. Runs outside the
 * sequential push queue, so by the time the fetch resolves a newer run may
 * have started for this document — then the backfill stays scoped to this
 * execution's keyed store and the newer run's document-level state is left
 * untouched.
 */
async function applyRecoveredExecutionState(executionId: string, options: PushHandlerOptions) {
	const { documentId, suppressExecutionSuccessToasts, suppressExecutionErrorToasts } = options;
	const workflowExecutionStateStore = useWorkflowExecutionStateStore(documentId);
	const uiStore = useUIStore();

	const execution = await fetchExecutionData(executionId, documentId);
	if (!execution) {
		uiStore.setProcessingExecutionResults(false);
		return;
	}

	const currentActiveExecutionId = workflowExecutionStateStore.activeExecutionId;
	const supersededByNewRun =
		currentActiveExecutionId !== undefined && currentActiveExecutionId !== executionId;

	const runExecutionData = getRunExecutionData(execution);
	uiStore.setProcessingExecutionResults(false);

	if (execution.data?.waitTill !== undefined) {
		if (!supersededByNewRun) {
			handleExecutionFinishedWithWaitTill(execution.workflowId ?? '', options);
		}
	} else if (execution.status === 'error' || execution.status === 'canceled') {
		// Shown even when superseded — the toast reports the recovered run truthfully.
		handleExecutionFinishedWithErrorOrCanceled(
			execution,
			runExecutionData,
			documentId,
			suppressExecutionErrorToasts,
		);
	} else if (!supersededByNewRun) {
		handleExecutionFinishedWithSuccessOrOther(
			documentId,
			execution.status,
			false,
			suppressExecutionSuccessToasts,
		);
	}

	if (supersededByNewRun) {
		backfillExecutionDataStore(execution, runExecutionData);
		return;
	}

	setRunExecutionData(execution, runExecutionData, documentId);
}
