import { ref } from 'vue';
import { defineStore } from 'pinia';
import * as whApi from '@/api/workflowHistory';
import { useRootStore } from '@/stores/n8nRoot.store';
import type { WorkflowHistory, WorkflowHistoryUnsaved } from '@/types/workflowHistory';

export const useWorkflowHistoryStore = defineStore('workflowHistory', () => {
	const rootStore = useRootStore();

	const workflowHistory = ref<Array<WorkflowHistory | WorkflowHistoryUnsaved>>([]);

	const getWorkflowHistory = async (workflowId: string) => {
		workflowHistory.value = await whApi
			.getWorkflowHistory(rootStore.getRestApiContext, workflowId)
			.catch((error) => {
				console.error(error);
				return [];
			});
	};

	const addUnsavedItem = (item: WorkflowHistoryUnsaved) => {
		workflowHistory.value.unshift(item);
	};

	return {
		getWorkflowHistory,
		addUnsavedItem,
		workflowHistory,
	};
});
