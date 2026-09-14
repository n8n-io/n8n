import { injectWorkflowExecutionStateStore } from '@/app/stores/workflowExecutionState.store';
import type { INode } from 'n8n-workflow';
import { computed, type ComputedRef } from 'vue';

export function useExecutionData({ node }: { node: ComputedRef<INode | undefined> }) {
	const workflowExecutionStateStore = injectWorkflowExecutionStateStore();

	const workflowExecution = computed(() => workflowExecutionStateStore.value.activeExecution);

	const workflowRunData = computed(() => workflowExecutionStateStore.value.activeExecutionRunData);

	// The store already dropped the entries of replaced nodes, so looking up by
	// name cannot return a deleted node's data.
	const nodeRunData = computed(() =>
		node.value ? (workflowRunData.value?.[node.value.name] ?? null) : null,
	);

	const hasNodeRun = computed(() => nodeRunData.value !== null);

	return {
		workflowExecution,
		workflowRunData,
		nodeRunData,
		hasNodeRun,
	};
}
