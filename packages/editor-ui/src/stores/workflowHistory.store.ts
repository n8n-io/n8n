import { ref } from 'vue';
import { defineStore } from 'pinia';
import * as whApi from '@/api/workflowHistory';
import { useRootStore } from '@/stores/n8nRoot.store';
import type { WorkflowHistory, WorkflowVersion } from '@/types/workflowHistory';

export const useWorkflowHistoryStore = defineStore('workflowHistory', () => {
	const rootStore = useRootStore();

	const workflowHistory = ref<WorkflowHistory[]>([]);
	const workflowVersion = ref<WorkflowVersion | null>(null);

	const getWorkflowHistory = async (
		workflowId: string,
		queryParams: Parameters<typeof whApi.getWorkflowHistory>[2],
	): Promise<WorkflowHistory[]> =>
		whApi
			.getWorkflowHistory(rootStore.getRestApiContext, workflowId, queryParams)
			.catch((error) => {
				console.error(error);
				return [] as WorkflowHistory[];
			});
	const addWorkflowHistory = (history: WorkflowHistory[]) => {
		workflowHistory.value = workflowHistory.value.concat(history);
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

	return {
		getWorkflowHistory,
		addWorkflowHistory,
		getWorkflowVersion,
		setWorkflowVersion,
		workflowHistory,
		workflowVersion,
	};
});
