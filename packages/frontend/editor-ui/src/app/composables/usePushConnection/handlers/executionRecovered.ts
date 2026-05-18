import type { ExecutionRecovered } from '@n8n/api-types/push/execution';
import { useUIStore } from '@/app/stores/ui.store';
import { useExecutionFinished } from './executionFinished';
import {
	createWorkflowExecutionStateId,
	useWorkflowExecutionStateStore,
} from '@/app/stores/workflowExecutionState.store';
import { computed } from 'vue';
import { useWorkflowId } from '../../useWorkflowId';

export function useExecutionRecovered() {
	const workflowId = useWorkflowId();
	const uiStore = useUIStore();
	const stateStore = computed(() =>
		useWorkflowExecutionStateStore(createWorkflowExecutionStateId(workflowId.value)),
	);
	const {
		fetchExecutionData,
		handleExecutionFinishedWithWaitTill,
		handleExecutionFinishedWithErrorOrCanceled,
		handleExecutionFinishedWithSuccessOrOther,
		setRunExecutionData,
		getRunExecutionData,
	} = useExecutionFinished();

	async function executionRecovered({ data }: ExecutionRecovered) {
		// No workflow is actively running, therefore we ignore this event
		if (typeof stateStore.value.activeExecutionId === 'undefined') {
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
