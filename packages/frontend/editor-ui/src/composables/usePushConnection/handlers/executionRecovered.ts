import type { ExecutionRecovered } from '@n8n/api-types/push/execution';
import { useUIStore } from '@/stores/ui.store';
import {
	getExecutionData,
	getRunExecutionData,
	handleExecutionFinishedWithOther,
	handleExecutionFinishedWithErrorOrCanceled,
	handleExecutionFinishedWithWaitTill,
	setRunExecutionData,
} from './executionFinished';
import { useWorkflowsStore } from '@/stores/workflows.store';

export async function executionRecovered({ data }: ExecutionRecovered) {
	const workflowsStore = useWorkflowsStore();
	const uiStore = useUIStore();

	// No workflow is actively running, therefore we ignore this event
	if (typeof workflowsStore.activeExecutionId === 'undefined') {
		return;
	}

	uiStore.setProcessingExecutionResults(true);

	const execution = await getExecutionData(data.executionId);
	if (!execution) {
		uiStore.setProcessingExecutionResults(false);
		return;
	}

	const runExecutionData = getRunExecutionData(execution);
	uiStore.setProcessingExecutionResults(false);

	if (execution.data?.waitTill !== undefined) {
		handleExecutionFinishedWithWaitTill();
	} else if (execution.status === 'error' || execution.status === 'canceled') {
		handleExecutionFinishedWithErrorOrCanceled(execution, runExecutionData);
	} else {
		handleExecutionFinishedWithOther();
	}

	setRunExecutionData(execution, runExecutionData);
}
