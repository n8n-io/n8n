import { computed } from 'vue';
import { defineStore } from 'pinia';
import type { IWorkflowDataUpdate } from '@/Interface';
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

	const licensePruneTime = computed(() => settingsStore.settings.workflowHistory.licensePruneTime);
	const pruneTime = computed(() => settingsStore.settings.workflowHistory.pruneTime);
	const evaluatedPruneTime = computed(() => Math.min(pruneTime.value, licensePruneTime.value));
	const shouldUpgrade = computed(
		() => licensePruneTime.value !== -1 && licensePruneTime.value === pruneTime.value,
	);

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

	const getWorkflowVersion = async (
		workflowId: string,
		versionId: string,
	): Promise<WorkflowVersion | null> =>
		whApi.getWorkflowVersion(rootStore.getRestApiContext, workflowId, versionId).catch((error) => {
			console.error(error);
			return null;
		});

	const cloneIntoNewWorkflow = async (
		workflowId: string,
		workflowVersionId: string,
		data: { formattedCreatedAt: string },
	) => {
		const [workflow, workflowVersion] = await Promise.all([
			workflowsStore.fetchWorkflow(workflowId),
			getWorkflowVersion(workflowId, workflowVersionId),
		]);
		if (workflow && workflowVersion?.nodes && workflowVersion?.connections) {
			const { connections, nodes } = workflowVersion;
			const { settings, tags } = workflow;
			const newWorkflowData: IWorkflowDataUpdate = {
				settings,
				tags,
				nodes,
				connections,
				active: false,
				name: `${workflow.name} (${data.formattedCreatedAt})`,
			};
			await workflowsStore.createNewWorkflow(newWorkflowData);
		}
	};

	const restoreWorkflow = async (workflowId: string, workflowVersionId: string) => {
		const workflowVersion = await getWorkflowVersion(workflowId, workflowVersionId);
		if (workflowVersion?.nodes && workflowVersion?.connections) {
			const { connections, nodes } = workflowVersion;
			await workflowsStore.updateWorkflow(workflowId, { connections, nodes }, true);
		}
	};

	return {
		getWorkflowHistory,
		getWorkflowVersion,
		cloneIntoNewWorkflow,
		restoreWorkflow,
		evaluatedPruneTime,
		shouldUpgrade,
	};
});
