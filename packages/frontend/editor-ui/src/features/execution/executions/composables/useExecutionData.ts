import { useWorkflowsStore } from '@/app/stores/workflows.store';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { getActiveExecutionDataStore } from '@/app/stores/executionData.store';
import type { INode, IRunExecutionData } from 'n8n-workflow';
import { computed, type ComputedRef } from 'vue';

export function useExecutionData({ node }: { node: ComputedRef<INode | undefined> }) {
	const workflowsStore = useWorkflowsStore();
	const workflowDocumentStore = useWorkflowDocumentStore(
		createWorkflowDocumentId(workflowsStore.workflowId),
	);

	const workflowExecution = computed(() => {
		return getActiveExecutionDataStore(workflowDocumentStore)?.execution ?? null;
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
