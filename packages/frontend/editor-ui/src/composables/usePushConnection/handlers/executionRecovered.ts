import type { ExecutionRecovered } from '@n8n/api-types/push/execution';
import { useUIStore } from '@/stores/ui.store';
import {
	fetchExecutionData,
	getRunExecutionData,
	handleExecutionFinishedWithOther,
	handleExecutionFinishedWithErrorOrCanceled,
	handleExecutionFinishedWithWaitTill,
	setRunExecutionData,
} from './executionFinished';
import { useWorkflowsStore } from '@/stores/workflows.store';
import type { useRouter } from 'vue-router';

export async function executionRecovered(
	{ data }: ExecutionRecovered,
	options: { router: ReturnType<typeof useRouter> },
) {
	const workflowsStore = useWorkflowsStore();
	const uiStore = useUIStore();

	// No workflow is actively running, therefore we ignore this event
	if (typeof workflowsStore.activeExecutionId === 'undefined') {
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
		handleExecutionFinishedWithWaitTill(options);
	} else if (execution.status === 'error' || execution.status === 'canceled') {
		handleExecutionFinishedWithErrorOrCanceled(execution, runExecutionData);
	} else {
		handleExecutionFinishedWithOther(false);
	}

	setRunExecutionData(execution, runExecutionData);
}
