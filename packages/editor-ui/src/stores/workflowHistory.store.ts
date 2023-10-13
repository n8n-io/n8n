import { computed } from 'vue';
import { defineStore } from 'pinia';
import { saveAs } from 'file-saver';
import type { IWorkflowDataUpdate } from '@/Interface';
import type {
	WorkflowHistory,
	WorkflowVersion,
	WorkflowHistoryRequestParams,
	WorkflowVersionId,
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
		whApi.getWorkflowHistory(rootStore.getRestApiContext, workflowId, queryParams);

	const getWorkflowVersion = async (
		workflowId: string,
		versionId: string,
	): Promise<WorkflowVersion | null> =>
		whApi.getWorkflowVersion(rootStore.getRestApiContext, workflowId, versionId);

	const downloadVersion = async (
		workflowId: string,
		workflowVersionId: WorkflowVersionId,
		data: { formattedCreatedAt: string },
	) => {
		const [workflow, workflowVersion] = await Promise.all([
			workflowsStore.fetchWorkflow(workflowId),
			getWorkflowVersion(workflowId, workflowVersionId),
		]);
		if (workflow && workflowVersion) {
			const { connections, nodes } = workflowVersion;
			const blob = new Blob([JSON.stringify({ ...workflow, nodes, connections }, null, 2)], {
				type: 'application/json;charset=utf-8',
			});
			saveAs(blob, `${workflow.name}(${data.formattedCreatedAt}).json`);
		}
	};

	const cloneIntoNewWorkflow = async (
		workflowId: string,
		workflowVersionId: string,
		data: { formattedCreatedAt: string },
	) => {
		const [workflow, workflowVersion] = await Promise.all([
			workflowsStore.fetchWorkflow(workflowId),
			getWorkflowVersion(workflowId, workflowVersionId),
		]);
		if (workflow && workflowVersion) {
			const { connections, nodes } = workflowVersion;
			const { name } = workflow;
			const newWorkflowData: IWorkflowDataUpdate = {
				nodes,
				connections,
				name: `${name} (${data.formattedCreatedAt})`,
			};
			await workflowsStore.createNewWorkflow(newWorkflowData);
		}
	};

	const restoreWorkflow = async (
		workflowId: string,
		workflowVersionId: string,
		shouldDeactivate: boolean,
	) => {
		const workflowVersion = await getWorkflowVersion(workflowId, workflowVersionId);
		if (workflowVersion?.nodes && workflowVersion?.connections) {
			const { connections, nodes } = workflowVersion;
			const updateData: IWorkflowDataUpdate = { connections, nodes };

			if (shouldDeactivate) {
				updateData.active = false;
			}

			await workflowsStore.updateWorkflow(workflowId, updateData, true);
		}
	};

	return {
		getWorkflowHistory,
		getWorkflowVersion,
		downloadVersion,
		cloneIntoNewWorkflow,
		restoreWorkflow,
		evaluatedPruneTime,
		shouldUpgrade,
	};
});
