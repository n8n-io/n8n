import { Nf as init_reactivity_esm_bundler, Vf as ref, lo as defineStore } from "./vendor-Hx42-oQF.js";
import { Fw as makeRestApiRequest, bC as useRootStore, yC as useSettingsStore } from "./app-D5flEmb-.js";
//#region src/features/settings/context/context.api.ts
var ENDPOINT = "/ai-preferences";
async function getPreferences(context, { ids, ...query } = {}) {
	return await makeRestApiRequest(context, "GET", ENDPOINT, {
		...query,
		...ids ? { ids: ids.join(",") } : {}
	});
}
async function getPreferenceCount(context) {
	return (await makeRestApiRequest(context, "GET", `${ENDPOINT}/count`)).count;
}
async function createPreference(context, payload) {
	return await makeRestApiRequest(context, "POST", ENDPOINT, payload);
}
async function updatePreference(context, id, payload) {
	return await makeRestApiRequest(context, "PATCH", `${ENDPOINT}/${id}`, payload);
}
async function deletePreference(context, id) {
	await makeRestApiRequest(context, "DELETE", `${ENDPOINT}/${id}`);
}
async function updatePreferenceSettings(context, payload) {
	return await makeRestApiRequest(context, "PATCH", "/ai-preference-settings", payload);
}
//#endregion
//#region src/features/settings/context/context.store.ts
init_reactivity_esm_bundler();
var useContextStore = defineStore("context", () => {
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();
	const preferences = ref([]);
	const count = ref(0);
	const loading = ref(false);
	let latestListRead = 0;
	let latestCountRead = 0;
	async function fetchPreferences(query = {}) {
		const listRead = ++latestListRead;
		const countRead = ++latestCountRead;
		loading.value = true;
		try {
			const response = await getPreferences(rootStore.restApiContext, query);
			if (listRead === latestListRead) preferences.value = response.data;
			if (countRead === latestCountRead) count.value = response.count;
			return response;
		} finally {
			if (listRead === latestListRead) loading.value = false;
		}
	}
	/**
	* The rows behind a list of ids, for a reader that already knows which rows it wants,
	* such as the plus menu naming the preferences a turn applied. Ids the caller cannot
	* see, or that no longer exist, are simply absent. Bypasses the paged `preferences`
	* state on purpose: this is a lookup, not the settings table.
	*/
	async function fetchPreferencesByIds(ids) {
		const pages = [];
		for (let start = 0; start < ids.length; start += 100) {
			const chunk = ids.slice(start, start + 100);
			const response = await getPreferences(rootStore.restApiContext, {
				ids: chunk,
				take: chunk.length
			});
			pages.push(response.data);
		}
		return pages.flat();
	}
	/**
	* The rows behind ids a reader holds, kept for lookup rather than for a list. A chat
	* card names the scope its own last write named, and a move made on the settings page
	* or over MCP never reaches it, so the card reads the row from here instead.
	*/
	const rowById = ref(/* @__PURE__ */ new Map());
	let pendingIds = /* @__PURE__ */ new Set();
	let pendingRead;
	/**
	* Counts the writes this store makes itself, and stamps the row each one touched. A read
	* carries the count it started at, so it cannot undo a write that landed while it was in
	* flight. Without it, a read begun on mount could put a row back where a save just moved
	* it from, or restore one a removal deleted.
	*/
	let writes = 0;
	const writtenAt = /* @__PURE__ */ new Map();
	let pendingStartedAt = 0;
	/**
	* Resolves rows by id. Every ask in the same tick becomes one read, so a turn with
	* several cards costs one request. An id the read does not return stays unresolved:
	* the caller keeps what it already knew, rather than reading a row it may not see
	* as a row that changed. A failed read resolves nothing and throws nothing, for the
	* same reason.
	*/
	async function resolveRows(ids) {
		for (const id of ids) pendingIds.add(id);
		if (pendingRead === void 0) pendingStartedAt = writes;
		await (pendingRead ??= (async () => {
			await Promise.resolve();
			const batch = [...pendingIds];
			const startedAt = pendingStartedAt;
			pendingIds = /* @__PURE__ */ new Set();
			pendingRead = void 0;
			if (batch.length === 0) return;
			try {
				const rows = await fetchPreferencesByIds(batch);
				const next = new Map(rowById.value);
				for (const row of rows) {
					if ((writtenAt.get(row.id) ?? 0) > startedAt) continue;
					next.set(row.id, row);
				}
				rowById.value = next;
			} catch {}
		})());
	}
	/** Records a row a write just returned, so the reader does not wait for another read. */
	function setRow(row) {
		writtenAt.set(row.id, ++writes);
		const next = new Map(rowById.value);
		next.set(row.id, row);
		rowById.value = next;
	}
	/** Drops a row a write just removed. Stamps it even when it was never resolved, so a read
	*  already in flight cannot bring the deleted row back. */
	function forgetRow(id) {
		writtenAt.set(id, ++writes);
		if (!rowById.value.has(id)) return;
		const next = new Map(rowById.value);
		next.delete(id);
		rowById.value = next;
	}
	async function fetchPreferenceCount() {
		const countRead = ++latestCountRead;
		const total = await getPreferenceCount(rootStore.restApiContext);
		if (countRead === latestCountRead) count.value = total;
		return total;
	}
	async function setPreferencesEnabled(enabled) {
		const saved = await updatePreferenceSettings(rootStore.restApiContext, { enabled });
		settingsStore.settings.aiPreferences = {
			...settingsStore.settings.aiPreferences,
			enabled: saved.enabled
		};
	}
	async function createPreference$1(payload) {
		const created = await createPreference(rootStore.restApiContext, payload);
		setRow(created);
		return created;
	}
	async function updatePreference$1(id, payload) {
		const updated = await updatePreference(rootStore.restApiContext, id, payload);
		setRow(updated);
		return updated;
	}
	async function deletePreference$1(id) {
		await deletePreference(rootStore.restApiContext, id);
		forgetRow(id);
	}
	/** Deletes every row it can and reports the failures. */
	async function deletePreferences(ids) {
		const results = await Promise.allSettled(ids.map(async (id) => await deletePreference(rootStore.restApiContext, id)));
		const result = {
			deleted: [],
			failed: []
		};
		results.forEach((outcome, index) => {
			const id = ids[index];
			if (outcome.status === "fulfilled") {
				result.deleted.push(id);
				forgetRow(id);
			} else result.failed.push({
				id,
				error: outcome.reason
			});
		});
		return result;
	}
	return {
		preferences,
		count,
		loading,
		rowById,
		fetchPreferences,
		fetchPreferencesByIds,
		resolveRows,
		setRow,
		forgetRow,
		fetchPreferenceCount,
		setPreferencesEnabled,
		createPreference: createPreference$1,
		updatePreference: updatePreference$1,
		deletePreference: deletePreference$1,
		deletePreferences
	};
});
//#endregion
export { useContextStore as t };
