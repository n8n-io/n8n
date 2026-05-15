import type { NodeExecuteBefore } from '@n8n/api-types/push/execution';
import {
	createWorkflowExecutionStateId,
	useWorkflowExecutionStateStore,
} from '@/app/stores/workflowExecutionState.store';
import { createExecutionDataId, useExecutionDataStore } from '@/app/stores/executionData.store';
import { injectWorkflowState } from '@/app/composables/useWorkflowState';
import { computed } from 'vue';
import { useWorkflowId } from '../../useWorkflowId';

/**
 * Handles the 'nodeExecuteBefore' event, which happens before a node is executed.
 */
export function useNodeExecuteBefore() {
	const workflowState = injectWorkflowState();
	const workflowId = useWorkflowId();
	const stateStore = computed(() =>
		useWorkflowExecutionStateStore(createWorkflowExecutionStateId(workflowId.value)),
	);

	async function nodeExecuteBefore({ data }: NodeExecuteBefore) {
		workflowState.executingNode.addExecutingNode(data.nodeName);

		const activeExecutionId = stateStore?.value?.activeExecutionId;
		if (typeof activeExecutionId === 'string') {
			useExecutionDataStore(createExecutionDataId(activeExecutionId)).addNodeExecutionStartedData(
				data,
			);
		}
	}

	return { nodeExecuteBefore };
}
