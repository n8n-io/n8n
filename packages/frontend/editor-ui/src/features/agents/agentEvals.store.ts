import { defineStore } from 'pinia';
import { ref } from 'vue';

import { STORES } from '@n8n/stores';
import { useRootStore } from '@n8n/stores/useRootStore';

import * as agentEvalsApi from './agentEvals.api';
import type { AgentEvalDatasetRecord, GenerateDraftCasesOptions } from './agentEvals.types';

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

	// The response carries the drafts, not the dataset row, so the list is
	// re-read rather than patched. Best-effort: generation already succeeded
	// server-side and cost model credits, so a transient refresh failure must not
	// surface as a generation failure (user retries → duplicate dataset). A stale
	// cache self-heals on the next fetch.
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
			await fetchDatasets(projectId, agentId).catch(() => null);
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
		fetchDatasets,
		generateDraftCases,
	};
});
