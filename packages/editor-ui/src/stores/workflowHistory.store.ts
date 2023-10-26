import { computed } from 'vue';
import { defineStore } from 'pinia';
import { saveAs } from 'file-saver';
import type { IWorkflowDataUpdate, IWorkflowDb } from '@/Interface';
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
import { getNewWorkflow } from '@/api/workflows';

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
	): Promise<WorkflowVersion> =>
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
		const { connections, nodes } = workflowVersion;
		const blob = new Blob([JSON.stringify({ ...workflow, nodes, connections }, null, 2)], {
			type: 'application/json;charset=utf-8',
		});
		saveAs(blob, `${workflow.name}(${data.formattedCreatedAt}).json`);
	};

	const cloneIntoNewWorkflow = async (
		workflowId: string,
		workflowVersionId: string,
		data: { formattedCreatedAt: string },
	): Promise<IWorkflowDb> => {
		const [workflow, workflowVersion] = await Promise.all([
			workflowsStore.fetchWorkflow(workflowId),
			getWorkflowVersion(workflowId, workflowVersionId),
		]);
		const { connections, nodes } = workflowVersion;
		const { name } = workflow;
		const newWorkflow = await getNewWorkflow(
			rootStore.getRestApiContext,
			`${name} (${data.formattedCreatedAt})`,
		);
		const newWorkflowData: IWorkflowDataUpdate = {
			nodes,
			connections,
			name: newWorkflow.name,
		};
		return workflowsStore.createNewWorkflow(newWorkflowData);
	};

	const restoreWorkflow = async (
		workflowId: string,
		workflowVersionId: string,
		shouldDeactivate: boolean,
	): Promise<IWorkflowDb> => {
		const workflowVersion = await getWorkflowVersion(workflowId, workflowVersionId);
		const { connections, nodes } = workflowVersion;
		const updateData: IWorkflowDataUpdate = { connections, nodes };

		if (shouldDeactivate) {
			updateData.active = false;
		}

		return workflowsStore.updateWorkflow(workflowId, updateData, true).catch(async (error) => {
			if (error.httpStatusCode === 400 && error.message.includes('can not be activated')) {
				return workflowsStore.fetchWorkflow(workflowId);
			} else {
				throw new Error(error);
			}
		});
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
