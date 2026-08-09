import { injectWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import type { INode } from 'n8n-workflow';
import { computed, type ComputedRef } from 'vue';

export function useExecutionData({ node }: { node: ComputedRef<INode | undefined> }) {
	const workflowExecutionStateStore = injectWorkflowExecutionStateStore();

	const workflowExecution = computed(() => workflowExecutionStateStore.value.activeExecution);

	const workflowRunData = computed(() => workflowExecutionStateStore.value.activeExecutionRunData);

	const hasNodeRun = computed(() => {
		return Boolean(
			node.value &&
				workflowRunData.value &&
				Object.prototype.hasOwnProperty.bind(workflowRunData.value)(node.value.name),
		);
	});

	return {
		workflowExecution,
		workflowRunData,
		hasNodeRun,
	};
}
