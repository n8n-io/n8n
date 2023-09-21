import { ref } from 'vue';
import { defineStore } from 'pinia';
import * as whApi from '@/api/workflowHistory';
import { useRootStore } from '@/stores/n8nRoot.store';
import type {
	WorkflowHistory,
	WorkflowHistoryUnsaved,
	WorkflowVersion,
} from '@/types/workflowHistory';

export const useWorkflowHistoryStore = defineStore('workflowHistory', () => {
	const rootStore = useRootStore();

	const workflowHistory = ref<Array<WorkflowHistory | WorkflowHistoryUnsaved>>([]);
	const workflowVersion = ref<WorkflowVersion | null>(null);

	const getWorkflowHistory = async (workflowId: string): Promise<WorkflowHistory[]> => {
		workflowHistory.value = await whApi
			.getWorkflowHistory(rootStore.getRestApiContext, workflowId)
			.catch((error) => {
				console.error(error);
				return [] as WorkflowHistory[];
			});
	};
	const getWorkflowVersion = async (
		workflowId: string,
		versionId: string,
	): Promise<WorkflowVersion | null> =>
		whApi.getWorkflowVersion(rootStore.getRestApiContext, workflowId, versionId).catch((error) => {
			console.error(error);
			return null;
		});

	const setWorkflowVersion = (version: WorkflowVersion | null) => {
		workflowVersion.value = version;
	};

	const addUnsavedItem = (item: WorkflowHistoryUnsaved) => {
		workflowHistory.value.unshift(item);
	};

	return {
		getWorkflowHistory,
		addUnsavedItem,
		getWorkflowVersion,
		setWorkflowVersion,
		workflowHistory,
		workflowVersion,
	};
});
