import type { INode, IRunExecutionData } from 'n8n-workflow';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	createWorkflowExecutionSessionId,
	useWorkflowExecutionSessionStore,
} from '@/app/stores/workflowExecutionSession.store';
import { computed, type ComputedRef } from 'vue';

export function useExecutionData({ node }: { node: ComputedRef<INode | undefined> }) {
	const workflowsStore = useWorkflowsStore();
	const workflowExecutionSessionStore = () =>
		useWorkflowExecutionSessionStore(createWorkflowExecutionSessionId(workflowsStore.workflowId));

	const workflowExecution = computed(() => {
		return workflowExecutionSessionStore().currentExecution;
	});

	const workflowRunData = computed(() => {
		if (workflowExecution.value === null) {
			return null;
		}
		const executionData: IRunExecutionData | undefined = workflowExecution.value.data;
		if (!executionData?.resultData?.runData) {
			return null;
		}
		return executionData.resultData.runData;
	});

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
