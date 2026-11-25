import { $d as init_runtime_core_esm_bundler, Nf as init_reactivity_esm_bundler, Rd as computed, Vf as ref } from "./vendor-Hx42-oQF.js";
import { Kn as toAgentListItem, Vo as listAgents, bC as useRootStore } from "./app-D5flEmb-.js";
//#region src/features/agents/composables/useProjectAgentsList.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
var caches = /* @__PURE__ */ new Map();
function getEntry(projectId) {
	let entry = caches.get(projectId);
	if (!entry) {
		entry = {
			list: ref(null),
			inFlight: null
		};
		caches.set(projectId, entry);
	}
	return entry;
}
async function loadProjectAgentsList(projectId, entry) {
	if (!entry.inFlight) {
		const request = listAgents(useRootStore().restApiContext, projectId).then((result) => {
			if (entry.inFlight === request) entry.list.value = result;
			return result;
		}).finally(() => {
			if (entry.inFlight === request) entry.inFlight = null;
		});
		entry.inFlight = request;
	}
	return await entry.inFlight;
}
function useProjectAgentsList(projectId) {
	const list = computed(() => {
		const id = projectId.value;
		return id ? getEntry(id).list.value : null;
	});
	async function ensureLoaded() {
		const id = projectId.value;
		if (!id) return [];
		const entry = getEntry(id);
		if (entry.inFlight) return await entry.inFlight;
		if (entry.list.value) return entry.list.value;
		return await loadProjectAgentsList(id, entry);
	}
	async function refresh() {
		const id = projectId.value;
		if (!id) return [];
		const entry = getEntry(id);
		entry.inFlight = null;
		return await loadProjectAgentsList(id, entry);
	}
	return {
		list,
		ensureLoaded,
		refresh
	};
}
function upsertProjectAgentsListCache(projectId, agent) {
	if (!projectId) return;
	const entry = getEntry(projectId);
	const current = entry.list.value;
	if (!current) return;
	const item = toAgentListItem(agent);
	if (current.findIndex((candidate) => candidate.id === item.id) === -1) {
		entry.list.value = [item, ...current];
		return;
	}
	entry.list.value = current.map((candidate) => candidate.id === item.id ? item : candidate);
}
function removeProjectAgentFromListCache(projectId, agentId) {
	if (!projectId) return;
	const entry = getEntry(projectId);
	const current = entry.list.value;
	if (!current) return;
	entry.list.value = current.filter((agent) => agent.id !== agentId);
}
function invalidateProjectAgentsListCache(projectId) {
	const entry = caches.get(projectId);
	if (entry && (entry.list.value || entry.inFlight)) {
		entry.inFlight = null;
		loadProjectAgentsList(projectId, entry).catch(() => {});
	}
}
//#endregion
export { useProjectAgentsList as i, removeProjectAgentFromListCache as n, upsertProjectAgentsListCache as r, invalidateProjectAgentsListCache as t };
