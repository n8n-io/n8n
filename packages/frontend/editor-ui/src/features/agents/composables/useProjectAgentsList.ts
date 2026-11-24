/**
 * Per-project cache of the agents list. Used by the builder header's agent
 * switcher. Matches the shape of `useAgentIntegrationsCatalog` — fetched once
 * per project, in-flight requests deduped, errors propagated so the next
 * `ensureLoaded()` can retry cleanly.
 */
import { computed, ref, type Ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import { listAgents } from './useAgentApi';
import { toAgentListItem, type Agent, type AgentListItem } from '../agent.types';

type Entry = {
	list: Ref<AgentListItem[] | null>;
	inFlight: Promise<AgentListItem[]> | null;
};

const caches = new Map<string, Entry>();

function getEntry(projectId: string): Entry {
	let entry = caches.get(projectId);
	if (!entry) {
		entry = { list: ref<AgentListItem[] | null>(null), inFlight: null };
		caches.set(projectId, entry);
	}
	return entry;
}

async function loadProjectAgentsList(projectId: string, entry: Entry): Promise<AgentListItem[]> {
	if (!entry.inFlight) {
		const request = listAgents(useRootStore().restApiContext, projectId)
			.then((result) => {
				if (entry.inFlight === request) {
					entry.list.value = result;
				}

				return result;
			})
			.finally(() => {
				if (entry.inFlight === request) {
					entry.inFlight = null;
				}
			});
		entry.inFlight = request;
	}

	return await entry.inFlight;
}

export function useProjectAgentsList(projectId: Ref<string>) {
	const list = computed(() => {
		const id = projectId.value;
		return id ? getEntry(id).list.value : null;
	});

	async function ensureLoaded(): Promise<AgentListItem[]> {
		const id = projectId.value;

		if (!id) return [];

		const entry = getEntry(id);

		if (entry.inFlight) return await entry.inFlight;

		if (entry.list.value) return entry.list.value;

		return await loadProjectAgentsList(id, entry);
	}

	async function refresh(): Promise<AgentListItem[]> {
		const id = projectId.value;

		if (!id) return [];

		const entry = getEntry(id);
		entry.inFlight = null;

		return await loadProjectAgentsList(id, entry);
	}

	return { list, ensureLoaded, refresh };
}

export function upsertProjectAgentsListCache(projectId: string, agent: Agent | AgentListItem) {
	if (!projectId) return;
	const entry = getEntry(projectId);
	const current = entry.list.value;
	if (!current) return;
	const item = toAgentListItem(agent);

	const existingIndex = current.findIndex((candidate) => candidate.id === item.id);
	if (existingIndex === -1) {
		entry.list.value = [item, ...current];
		return;
	}

	entry.list.value = current.map((candidate) => (candidate.id === item.id ? item : candidate));
}

export function removeProjectAgentFromListCache(projectId: string, agentId: string) {
	if (!projectId) return;
	const entry = getEntry(projectId);
	const current = entry.list.value;
	if (!current) return;

	entry.list.value = current.filter((agent) => agent.id !== agentId);
}

export function invalidateProjectAgentsListCache(projectId: string) {
	const entry = caches.get(projectId);

	if (entry && (entry.list.value || entry.inFlight)) {
		entry.inFlight = null;
		void loadProjectAgentsList(projectId, entry).catch(() => {
			// Keep the last list if the background refresh fails.
		});
	}
}

/** Test-only escape hatch — drops the module-level cache between specs. */
export function __clearProjectAgentsListCacheForTests() {
	caches.clear();
}
