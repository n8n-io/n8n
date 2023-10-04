import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import * as whApi from '@/api/workflowHistory';
import { useRootStore } from '@/stores/n8nRoot.store';
import { useSettingsStore } from '@/stores/settings.store';
import type {
	WorkflowHistory,
	WorkflowVersion,
	WorkflowHistoryRequestParams,
} from '@/types/workflowHistory';

export const useWorkflowHistoryStore = defineStore('workflowHistory', () => {
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();

	const workflowHistory = ref<WorkflowHistory[]>([]);
	const activeWorkflowVersion = ref<WorkflowVersion | null>(null);
	const licensePruneTime = computed(() => settingsStore.settings.workflowHistory.licensePruneTime);
	const pruneTime = computed(() => settingsStore.settings.workflowHistory.pruneTime);
	const evaluatedPruneTime = computed(() => Math.min(pruneTime.value, licensePruneTime.value));
	const shouldUpgrade = computed(
		() => licensePruneTime.value !== -1 && licensePruneTime.value === pruneTime.value,
	);

	const reset = () => {
		workflowHistory.value = [];
		activeWorkflowVersion.value = null;
	};

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
		reset,
		getWorkflowHistory,
		addWorkflowHistory,
		getWorkflowVersion,
		setActiveWorkflowVersion,
		workflowHistory,
		activeWorkflowVersion,
		evaluatedPruneTime,
		shouldUpgrade,
	};
});
