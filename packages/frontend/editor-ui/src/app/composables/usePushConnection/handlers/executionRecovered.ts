import type { ExecutionRecovered } from '@n8n/api-types/push/execution';
import { useUIStore } from '@/app/stores/ui.store';
import {
	fetchExecutionData,
	getRunExecutionData,
	handleExecutionFinishedWithSuccessOrOther,
	handleExecutionFinishedWithErrorOrCanceled,
	handleExecutionFinishedWithWaitTill,
	setRunExecutionData,
	type ExecutionFinishedOptions,
} from './executionFinished';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import { createWorkflowDocumentId } from '@/app/stores/workflowDocument.store';

export async function executionRecovered(
	{ data }: ExecutionRecovered,
	options: ExecutionFinishedOptions,
) {
	const workflowsStore = useWorkflowsStore();
	const workflowExecutionStateStore = useWorkflowExecutionStateStore(
		createWorkflowDocumentId(workflowsStore.workflowId),
	);
	const uiStore = useUIStore();

	// No workflow is actively running, therefore we ignore this event
	if (typeof workflowExecutionStateStore.activeExecutionId === 'undefined') {
		return;
	}

	uiStore.setProcessingExecutionResults(true);

	const execution = await fetchExecutionData(data.executionId);
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
			options.executionErrorToastSuppression,
		);
	} else {
		handleExecutionFinishedWithSuccessOrOther(options.workflowState, execution.status, false);
	}

	if (execution.data?.waitTill === undefined) {
		options.executionErrorToastSuppression?.clearExecutionErrorToastSuppression(execution.id);
	}

	setRunExecutionData(execution, runExecutionData, options.workflowState);
}
