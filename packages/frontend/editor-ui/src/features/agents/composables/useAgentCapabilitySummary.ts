import { ref, watch, type Ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { IRestApiContext } from '@n8n/rest-api-client';
import type { AgentCapabilitySummary } from '@n8n/api-types';
import { agentsEventBus } from '../agents.eventBus';
import { getAgentCapabilitySummary } from './useAgentApi';

// Shared across all agent cards, so the same agent referenced by multiple
// nodes is fetched once. Invalidated through the `agentUpdated` bus event.
const summaryCache = new Map<string, AgentCapabilitySummary>();

// In-flight requests, so N cards mounting together for the same agent (cold
// canvas load) share one GET instead of issuing N parallel ones.
const inFlightRequests = new Map<string, Promise<AgentCapabilitySummary>>();

// Bumped on every invalidation so mounted cards refetch reactively.
const cacheVersion = ref(0);

function cacheKey(projectId: string, agentId: string) {
	return `${projectId}:${agentId}`;
}

export function clearAgentCapabilitySummaryCache() {
	summaryCache.clear();
	inFlightRequests.clear();
	// Without the bump, mounted cards would keep serving their in-component copy.
	cacheVersion.value++;
}

// Module-level listener: agent edits can happen while no card is
// mounted (e.g. on the Agent Builder route, where the canvas is torn down),
// and remounted cards must not serve the stale pre-edit summary.
agentsEventBus.on('agentUpdated', (event) => {
	if (event?.agentId) {
		for (const cache of [summaryCache, inFlightRequests] as Array<Map<string, unknown>>) {
			for (const key of [...cache.keys()]) {
				if (key.endsWith(`:${event.agentId}`)) cache.delete(key);
			}
		}
	} else {
		summaryCache.clear();
		inFlightRequests.clear();
	}

	cacheVersion.value++;
});

async function requestSummary(
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<AgentCapabilitySummary> {
	const key = cacheKey(projectId, agentId);
	let request = inFlightRequests.get(key);
	if (!request) {
		request = getAgentCapabilitySummary(context, projectId, agentId)
			.then((result) => {
				// Skip caching if invalidated mid-flight (eviction removed the entry) —
				// the invalidation's cacheVersion bump already scheduled a fresh fetch.
				if (inFlightRequests.get(key) === request) summaryCache.set(key, result);
				return result;
			})
			.finally(() => {
				if (inFlightRequests.get(key) === request) inFlightRequests.delete(key);
			});

		inFlightRequests.set(key, request);
	}
	return await request;
}

/**
 * Fetches the capability summary (model + capability chip labels) for the agent rendered on
 * a canvas card. Re-fetches when the selected agent or project scope changes, or when an
 * `agentUpdated` bus event invalidates the cache (edits in the NDV or the Agent Builder).
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
			const result = await requestSummary(
				rootStore.restApiContext,
				currentProjectId,
				currentAgentId,
			);

			if (generation !== loadGeneration) return;

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

	watch([projectId, agentId, cacheVersion], fetch, { immediate: true });

	return { summary, isLoading, error, fetch };
}
