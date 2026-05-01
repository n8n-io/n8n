import { useWorkflowId } from '@/app/composables/useWorkflowId';
import {
	createWorkflowExecutionSessionId,
	useWorkflowExecutionSessionStore,
} from '@/app/stores/workflowExecutionSession.store';
import type { INode, IRunExecutionData } from 'n8n-workflow';
import { computed, type ComputedRef } from 'vue';

export function useExecutionData({ node }: { node: ComputedRef<INode | undefined> }) {
	const workflowId = useWorkflowId();
	const workflowExecutionSession = computed(() =>
		useWorkflowExecutionSessionStore(createWorkflowExecutionSessionId(workflowId.value)),
	);

	const workflowExecution = computed(() => {
		return workflowExecutionSession.value.activeExecution;
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
