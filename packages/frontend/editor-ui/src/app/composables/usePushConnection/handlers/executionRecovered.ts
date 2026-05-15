import type { ExecutionRecovered } from '@n8n/api-types/push/execution';
import { useUIStore } from '@/app/stores/ui.store';
import { useExecutionFinished } from './executionFinished';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	createWorkflowExecutionStateId,
	useWorkflowExecutionStateStore,
} from '@/app/stores/workflowExecutionState.store';

export function useExecutionRecovered() {
	const workflowsStore = useWorkflowsStore();
	const uiStore = useUIStore();
	const {
		fetchExecutionData,
		handleExecutionFinishedWithWaitTill,
		handleExecutionFinishedWithErrorOrCanceled,
		handleExecutionFinishedWithSuccessOrOther,
		setRunExecutionData,
		getRunExecutionData,
	} = useExecutionFinished();

	async function executionRecovered({ data }: ExecutionRecovered) {
		const stateStore = useWorkflowExecutionStateStore(
			createWorkflowExecutionStateId(workflowsStore.workflowId),
		);

		// No workflow is actively running, therefore we ignore this event
		if (typeof stateStore.activeExecutionId === 'undefined') {
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
			handleExecutionFinishedWithWaitTill(execution.workflowId ?? '');
		} else if (execution.status === 'error' || execution.status === 'canceled') {
			handleExecutionFinishedWithErrorOrCanceled(execution, runExecutionData);
		} else {
			handleExecutionFinishedWithSuccessOrOther(execution.status, false);
		}

		setRunExecutionData(execution, runExecutionData);
	}

	return { executionRecovered };
}
