/**
 * Per-project cache of the agents list. Used by the builder header's agent
 * switcher. Matches the shape of `useAgentIntegrationsCatalog` — fetched once
 * per project, in-flight requests deduped, errors propagated so the next
 * `ensureLoaded()` can retry cleanly.
 */
import { computed, ref, type Ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import { listAgents } from './useAgentApi';
import type { AgentResource } from '../types';

type Entry = {
	list: Ref<AgentResource[] | null>;
	inFlight: Promise<AgentResource[]> | null;
};

const caches = new Map<string, Entry>();

function getEntry(projectId: string): Entry {
	let entry = caches.get(projectId);
	if (!entry) {
		entry = { list: ref<AgentResource[] | null>(null), inFlight: null };
		caches.set(projectId, entry);
	}
	return entry;
}

export function useProjectAgentsList(projectId: Ref<string>) {
	const rootStore = useRootStore();
	const list = computed(() => {
		const id = projectId.value;
		return id ? getEntry(id).list.value : null;
	});

	async function ensureLoaded(): Promise<AgentResource[]> {
		const id = projectId.value;
		if (!id) return [];
		const entry = getEntry(id);
		if (entry.list.value) return entry.list.value;
		if (!entry.inFlight) {
			entry.inFlight = listAgents(rootStore.restApiContext, id)
				.then((result) => {
					entry.list.value = result;
					entry.inFlight = null;
					return result;
				})
				.catch((err: unknown) => {
					entry.inFlight = null;
					throw err;
				});
		}
		return await entry.inFlight;
	}

	async function refresh(): Promise<AgentResource[]> {
		const id = projectId.value;
		if (!id) return [];
		const entry = getEntry(id);
		entry.list.value = null;
		return await ensureLoaded();
	}

	return { list, ensureLoaded, refresh };
}

export function upsertProjectAgentsListCache(projectId: string, agent: AgentResource) {
	if (!projectId) return;
	const entry = getEntry(projectId);
	const current = entry.list.value;
	if (!current) return;

	const existingIndex = current.findIndex((candidate) => candidate.id === agent.id);
	if (existingIndex === -1) {
		entry.list.value = [agent, ...current];
		return;
	}

	entry.list.value = current.map((candidate) => (candidate.id === agent.id ? agent : candidate));
}

export function removeProjectAgentFromListCache(projectId: string, agentId: string) {
	if (!projectId) return;
	const entry = getEntry(projectId);
	const current = entry.list.value;
	if (!current) return;

	entry.list.value = current.filter((agent) => agent.id !== agentId);
}

/** Test-only escape hatch — drops the module-level cache between specs. */
export function __clearProjectAgentsListCacheForTests() {
	caches.clear();
}
