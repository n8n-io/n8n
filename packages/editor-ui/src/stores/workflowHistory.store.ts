import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import * as whApi from '@/api/workflowHistory';
import { useRootStore } from '@/stores/n8nRoot.store';
import type {
	WorkflowHistory,
	WorkflowVersion,
	WorkflowHistoryRequestParams,
} from '@/types/workflowHistory';

export const useWorkflowHistoryStore = defineStore('workflowHistory', () => {
	const rootStore = useRootStore();

	const workflowHistory = ref<WorkflowHistory[]>([]);
	const activeWorkflowVersion = ref<WorkflowVersion | null>(null);
	const maxRetentionPeriod = ref(0);
	const retentionPeriod = ref(0);
	const shouldUpgrade = computed(() => maxRetentionPeriod.value === retentionPeriod.value);

	const getWorkflowHistory = async (
		workflowId: string,
		queryParams: WorkflowHistoryRequestParams,
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
	const setActiveWorkflowVersion = (version: WorkflowVersion | null) => {
		activeWorkflowVersion.value = version;
	};

	return {
		getWorkflowHistory,
		addWorkflowHistory,
		getWorkflowVersion,
		setActiveWorkflowVersion,
		workflowHistory,
		activeWorkflowVersion,
		shouldUpgrade,
		maxRetentionPeriod,
	};
});
