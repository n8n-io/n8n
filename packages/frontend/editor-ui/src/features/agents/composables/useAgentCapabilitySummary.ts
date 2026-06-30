import { ref, watch, type Ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { AgentCapabilitySummary } from '@n8n/api-types';
import { getAgentCapabilitySummary } from './useAgentApi';

// Shared across all agent cards. Capability chips are static (no live updates), so the
// same agent referenced by multiple nodes is fetched once.
const summaryCache = new Map<string, AgentCapabilitySummary>();

function cacheKey(projectId: string, agentId: string) {
	return `${projectId}:${agentId}`;
}

export function clearAgentCapabilitySummaryCache() {
	summaryCache.clear();
}

/**
 * Fetches the capability summary (model + capability chip labels) for the agent rendered on
 * a canvas card. Re-fetches when the selected agent or project scope changes.
 */
export function useAgentCapabilitySummary(projectId: Ref<string>, agentId: Ref<string>) {
	const rootStore = useRootStore();

	const summary = ref<AgentCapabilitySummary | null>(null);
	const isLoading = ref(false);
	const error = ref<unknown | null>(null);

	// A monotonic generation number so a slow request for a
	// superseded agent can't clobber a newer one's result.
	let loadGeneration = 0;

	async function fetch() {
		const currentProjectId = projectId.value;
		const currentAgentId = agentId.value;

		loadGeneration++;
		const generation = loadGeneration;

		// Empty card or unresolved project scope: nothing to fetch.
		if (!currentProjectId || !currentAgentId) {
			summary.value = null;
			isLoading.value = false;
			error.value = null;
			return;
		}

		const cached = summaryCache.get(cacheKey(currentProjectId, currentAgentId));
		if (cached) {
			summary.value = cached;
			isLoading.value = false;
			error.value = null;
			return;
		}

		isLoading.value = true;
		error.value = null;

		try {
			const result = await getAgentCapabilitySummary(
				rootStore.restApiContext,
				currentProjectId,
				currentAgentId,
			);

			if (generation !== loadGeneration) return;

			summaryCache.set(cacheKey(currentProjectId, currentAgentId), result);
			summary.value = result;
		} catch (e) {
			if (generation !== loadGeneration) return;
			error.value = e;
			summary.value = null;
		} finally {
			if (generation === loadGeneration) {
				isLoading.value = false;
			}
		}
	}

	watch([projectId, agentId], fetch, { immediate: true });

	return { summary, isLoading, error, fetch };
}
