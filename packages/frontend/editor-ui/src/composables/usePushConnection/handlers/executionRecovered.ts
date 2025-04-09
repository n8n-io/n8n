import type { ExecutionRecovered } from '@n8n/api-types/push/execution';
import { useUIStore } from '@/stores/ui.store';
import { codeNodeEditorEventBus } from '@/event-bus';
import {
	getExecutionData,
	getRunExecutionData,
	handleExecutionFinished,
	handleExecutionFinishedWithErrorOrCanceled,
	handleExecutionFinishedWithWaitTill,
} from './executionFinished';

export async function executionRecovered({ data }: ExecutionRecovered) {
	const uiStore = useUIStore();

	if (!uiStore.isActionActive.workflowRunning) {
		// No workflow is running so ignore the messages
		return false;
	}

	uiStore.setProcessingExecutionResults(true);

	const execution = await getExecutionData(data.executionId);
	if (!execution) {
		uiStore.setProcessingExecutionResults(false);
		return false;
	}

	const runExecutionData = getRunExecutionData(execution);
	uiStore.setProcessingExecutionResults(false);

	if (execution.data?.waitTill !== undefined) {
		handleExecutionFinishedWithWaitTill();
	} else if (execution.status === 'error' || execution.status === 'canceled') {
		handleExecutionFinishedWithErrorOrCanceled(execution, runExecutionData);
	} else {
		handleExecutionFinished(execution, runExecutionData, successToastAlreadyShown);
	}

	const lineNumber = runExecutionData.resultData?.error?.lineNumber;
	codeNodeEditorEventBus.emit('highlightLine', lineNumber ?? 'last');
}
