import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import type {
	WorkflowHistory,
	WorkflowVersion,
	WorkflowHistoryRequestParams,
} from '@/types/workflowHistory';
import * as whApi from '@/api/workflowHistory';
import { useRootStore } from '@/stores/n8nRoot.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useWorkflowsStore } from '@/stores/workflows.store';

export const useWorkflowHistoryStore = defineStore('workflowHistory', () => {
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();
	const workflowsStore = useWorkflowsStore();

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

	const cloneIntoNewWorkflow = async (workflowId: string, versionId: string) => {
		const [workflow, workflowVersion] = await Promise.all([
			workflowsStore.fetchWorkflow(workflowId),
			getWorkflowVersion(workflowId, versionId),
		]);
		if (workflow && newWorkflowData && workflowVersion?.nodes && workflowVersion?.connections) {
			const { connections, nodes } = workflowVersion;
			const { id, ...newWorkflowData } = workflow;
			const newWorkflow = {
				newWorkflowData,
				nodes,
				connections,
				name: `${workflow.name} (clone)`,
			};
			console.log(newWorkflow);
		}
	};

	return {
		reset,
		getWorkflowHistory,
		addWorkflowHistory,
		getWorkflowVersion,
		setActiveWorkflowVersion,
		cloneIntoNewWorkflow,
		workflowHistory,
		activeWorkflowVersion,
		evaluatedPruneTime,
		shouldUpgrade,
	};
});
