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

	/**
	 * A request from another surface to focus an agent's eval tab, optionally
	 * generating on arrival — raised by the assistant's post-setup suggestion.
	 *
	 * Held here rather than emitted on the event bus because the builder that
	 * serves the request may not be mounted yet when it's raised (the assistant
	 * has to reveal the agent artifact first). A watcher can consume a request
	 * that predates it; a fire-and-forget event would be dropped.
	 */
	const pendingEvalsFocus = ref<{ agentId: string; generate: boolean } | null>(null);

	const requestEvalsFocus = (agentId: string, generate = false) => {
		pendingEvalsFocus.value = { agentId, generate };
	};

	/** Claims the request when it names this agent, so only one builder acts on it. */
	const consumeEvalsFocus = (agentId: string) => {
		const request = pendingEvalsFocus.value;
		if (request?.agentId !== agentId) return null;
		pendingEvalsFocus.value = null;
		return request;
	};

	/**
	 * Drops an unclaimed request for this agent. Called by the surface that raised
	 * it when it goes away: without this, a request no builder ever picked up
	 * would sit here for the rest of the session and then fire in an unrelated
	 * context, jumping to Evals and generating cases the user didn't ask for at
	 * that moment.
	 *
	 * Scoped by agent for the same reason `consumeEvalsFocus` is — a surface
	 * tearing down must not discard a request some other surface just raised.
	 */
	const clearEvalsFocus = (agentId: string) => {
		if (pendingEvalsFocus.value?.agentId !== agentId) return;
		pendingEvalsFocus.value = null;
	};

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
		pendingEvalsFocus,
		requestEvalsFocus,
		consumeEvalsFocus,
		clearEvalsFocus,
	};
});
