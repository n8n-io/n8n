import { injectWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import type { INode } from 'n8n-workflow';
import { computed, type ComputedRef } from 'vue';

export function useExecutionData({ node }: { node: ComputedRef<INode | undefined> }) {
	const workflowExecutionStateStore = injectWorkflowExecutionStateStore();

	const workflowExecution = computed(() => workflowExecutionStateStore.value.activeExecution);

	const workflowRunData = computed(() => workflowExecutionStateStore.value.activeExecutionRunData);

	const hasExecutionNodeSnapshot = computed(
		() => (workflowExecution.value?.workflowData?.nodes?.length ?? 0) > 0,
	);

	const nodeRunData = computed(() => {
		if (!node.value) {
			return null;
		}

		if (hasExecutionNodeSnapshot.value) {
			return (
				workflowExecutionStateStore.value.activeExecutionRunDataByNodeId.get(node.value.id)
					?.value ?? null
			);
		}

		return workflowRunData.value?.[node.value.name] ?? null;
	});

	const hasNodeRun = computed(() => nodeRunData.value !== null);

	return {
		workflowExecution,
		workflowRunData,
		nodeRunData,
		hasNodeRun,
	};
}
