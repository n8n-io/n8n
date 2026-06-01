/**
 * Per-project cache of the agents list. Used by the builder header's agent
 * switcher. Matches the shape of `useAgentIntegrationsCatalog` — fetched once
 * per project, in-flight requests deduped, errors propagated so the next
 * `ensureLoaded()` can retry cleanly.
 */
import { ref, watch, type Ref } from 'vue';
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
	const list = ref<AgentResource[] | null>(null);

	function bind(id: string) {
		if (!id) {
			list.value = null;
			return;
		}
		list.value = getEntry(id).list.value;
	}

	bind(projectId.value);
	watch(projectId, (id) => bind(id));

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
					if (projectId.value === id) list.value = result;
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

/** Test-only escape hatch — drops the module-level cache between specs. */
export function __clearProjectAgentsListCacheForTests() {
	caches.clear();
}
