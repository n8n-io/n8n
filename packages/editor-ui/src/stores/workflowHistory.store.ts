import { ref } from 'vue';
import { defineStore } from 'pinia';
import * as whApi from '@/api/workflowHistory';
import { useRootStore } from '@/stores/n8nRoot.store';

export const useWorkflowHistoryStore = defineStore('workflowHistory', () => {
	const rootStore = useRootStore();

	const workflowHistory = ref([]);

	const getWorkflowHistory = async (workflowId: string) => {
		workflowHistory.value = await whApi
			.getWorkflowHistory(rootStore.getRestApiContext, workflowId)
			.catch((error) => {
				console.error(error);
				return [];
			});
	};

	return {
		getWorkflowHistory,
		workflowHistory,
	};
});
