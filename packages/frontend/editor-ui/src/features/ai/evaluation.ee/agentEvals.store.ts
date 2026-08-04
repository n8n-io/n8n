import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { STORES } from '@n8n/stores';
import { useRootStore } from '@n8n/stores/useRootStore';

import * as agentEvalsApi from './agentEvals.api';
import type {
	AgentEvalDatasetRecord,
	CreateAgentEvalDatasetDto,
	GenerateDraftCasesOptions,
	UpdateAgentEvalDatasetPayload,
} from './agentEvals.types';

/**
 * Client state for an agent's eval datasets.
 *
 * Runs, per-case results and ratings are deliberately not here yet: their list
 * responses are being reshaped into paginated envelopes, so binding them now
 * would only have to be redone. Add them alongside the views that read them.
 */
export const useAgentEvalsStore = defineStore(STORES.AGENT_EVALS, () => {
	const rootStore = useRootStore();

	// Keyed by agentId so switching agents inside the builder can't render the
	// previous agent's datasets.
	const datasetsByAgentId = ref<Record<string, AgentEvalDatasetRecord[]>>({});

	const loadingDatasets = ref<Record<string, boolean>>({});
	const generatingCases = ref<Record<string, boolean>>({});

	const getDatasets = (agentId: string) => datasetsByAgentId.value[agentId] ?? [];

	// Absence of a cache entry is "not loaded yet", not "none" — callers that
	// need to distinguish the two should check `isLoaded` before `getDatasets`.
	const isLoaded = (agentId: string) => datasetsByAgentId.value[agentId] !== undefined;

	const isLoadingDatasets = (agentId: string) => loadingDatasets.value[agentId] === true;

	const isGeneratingCases = (agentId: string) => generatingCases.value[agentId] === true;

	const isBusy = computed(
		() =>
			Object.values(loadingDatasets.value).some(Boolean) ||
			Object.values(generatingCases.value).some(Boolean),
	);

	const setDatasets = (agentId: string, datasets: AgentEvalDatasetRecord[]) => {
		datasetsByAgentId.value = { ...datasetsByAgentId.value, [agentId]: datasets };
	};

	const fetchDatasets = async (projectId: string, agentId: string) => {
		loadingDatasets.value = { ...loadingDatasets.value, [agentId]: true };
		try {
			const datasets = await agentEvalsApi.getDatasets(
				rootStore.restApiContext,
				projectId,
				agentId,
			);
			setDatasets(agentId, datasets);
			return datasets;
		} finally {
			loadingDatasets.value = { ...loadingDatasets.value, [agentId]: false };
		}
	};

	const createDataset = async (
		projectId: string,
		agentId: string,
		payload: CreateAgentEvalDatasetDto,
	) => {
		const created = await agentEvalsApi.createDataset(
			rootStore.restApiContext,
			projectId,
			agentId,
			payload,
		);
		setDatasets(agentId, [...getDatasets(agentId), created]);
		return created;
	};

	const updateDataset = async (
		projectId: string,
		agentId: string,
		datasetId: string,
		payload: UpdateAgentEvalDatasetPayload,
	) => {
		const updated = await agentEvalsApi.updateDataset(
			rootStore.restApiContext,
			projectId,
			agentId,
			datasetId,
			payload,
		);
		setDatasets(
			agentId,
			getDatasets(agentId).map((dataset) => (dataset.id === datasetId ? updated : dataset)),
		);
		return updated;
	};

	const deleteDataset = async (projectId: string, agentId: string, datasetId: string) => {
		await agentEvalsApi.deleteDataset(rootStore.restApiContext, projectId, agentId, datasetId);
		setDatasets(
			agentId,
			getDatasets(agentId).filter((dataset) => dataset.id !== datasetId),
		);
	};

	// The server persists the drafts as a new dataset, so the local cache is
	// refreshed from the response rather than re-fetching the list.
	const generateDraftCases = async (
		projectId: string,
		agentId: string,
		options: GenerateDraftCasesOptions = {},
	) => {
		generatingCases.value = { ...generatingCases.value, [agentId]: true };
		try {
			const result = await agentEvalsApi.generateDraftCases(
				rootStore.restApiContext,
				projectId,
				agentId,
				options,
			);
			await fetchDatasets(projectId, agentId);
			return result;
		} finally {
			generatingCases.value = { ...generatingCases.value, [agentId]: false };
		}
	};

	return {
		getDatasets,
		isLoaded,
		isLoadingDatasets,
		isGeneratingCases,
		isBusy,
		fetchDatasets,
		createDataset,
		updateDataset,
		deleteDataset,
		generateDraftCases,
	};
});
