import type { AiPreferenceRequestDto } from '@n8n/api-types';
import { AI_PREFERENCES_MAX_IDS_FILTER } from '@n8n/api-types';
import { defineStore } from 'pinia';
import { ref } from 'vue';

import { useRootStore } from '@n8n/stores/useRootStore';

import * as api from './context.api';
import type { Preference, PreferenceListQuery } from './context.types';

export type BulkDeleteResult = {
	deleted: string[];
	failed: Array<{ id: string; error: unknown }>;
};

export const useContextStore = defineStore('context', () => {
	const rootStore = useRootStore();

	const preferences = ref<Preference[]>([]);
	const count = ref(0);
	const loading = ref(false);

	/*
	 * Reads land in completion order. Only the newest read of each kind commits, and a
	 * count read must not clear the list's `loading` flag.
	 */

	let latestListRead = 0;
	let latestCountRead = 0;

	async function fetchPreferences(query: PreferenceListQuery = {}) {
		const listRead = ++latestListRead;
		const countRead = ++latestCountRead;
		loading.value = true;
		try {
			const response = await api.getPreferences(rootStore.restApiContext, query);
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
	async function fetchPreferencesByIds(ids: string[]): Promise<Preference[]> {
		const pages: Preference[][] = [];
		for (let start = 0; start < ids.length; start += AI_PREFERENCES_MAX_IDS_FILTER) {
			const chunk = ids.slice(start, start + AI_PREFERENCES_MAX_IDS_FILTER);
			const response = await api.getPreferences(rootStore.restApiContext, {
				ids: chunk,
				take: chunk.length,
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
	const rowById = ref(new Map<string, Preference>());
	let pendingIds = new Set<string>();
	let pendingRead: Promise<void> | undefined;

	/**
	 * Resolves rows by id. Every ask in the same tick becomes one read, so a turn with
	 * several cards costs one request. An id the read does not return stays unresolved:
	 * the caller keeps what it already knew, rather than reading a row it may not see
	 * as a row that changed. A failed read resolves nothing and throws nothing, for the
	 * same reason.
	 */
	async function resolveRows(ids: string[]): Promise<void> {
		for (const id of ids) pendingIds.add(id);
		const read = (pendingRead ??= (async () => {
			// One microtask, so cards that render together join the same read.
			await Promise.resolve();
			const batch = [...pendingIds];
			pendingIds = new Set();
			pendingRead = undefined;
			if (batch.length === 0) return;
			try {
				const rows = await fetchPreferencesByIds(batch);
				const next = new Map(rowById.value);
				for (const row of rows) next.set(row.id, row);
				rowById.value = next;
			} catch {
				// The caller falls back to what it knew.
			}
		})());
		await read;
	}

	/** Records a row a write just returned, so the reader does not wait for another read. */
	function setRow(row: Preference) {
		const next = new Map(rowById.value);
		next.set(row.id, row);
		rowById.value = next;
	}

	/** Drops a row a write just removed. */
	function forgetRow(id: string) {
		if (!rowById.value.has(id)) return;
		const next = new Map(rowById.value);
		next.delete(id);
		rowById.value = next;
	}

	async function fetchPreferenceCount() {
		const countRead = ++latestCountRead;
		const total = await api.getPreferenceCount(rootStore.restApiContext);
		if (countRead === latestCountRead) count.value = total;
		return total;
	}

	async function createPreference(payload: AiPreferenceRequestDto) {
		return await api.createPreference(rootStore.restApiContext, payload);
	}

	async function updatePreference(id: string, payload: AiPreferenceRequestDto) {
		return await api.updatePreference(rootStore.restApiContext, id, payload);
	}

	async function deletePreference(id: string) {
		await api.deletePreference(rootStore.restApiContext, id);
	}

	/** Deletes every row it can and reports the failures. */
	async function deletePreferences(ids: string[]): Promise<BulkDeleteResult> {
		const results = await Promise.allSettled(
			ids.map(async (id) => await api.deletePreference(rootStore.restApiContext, id)),
		);
		const result: BulkDeleteResult = { deleted: [], failed: [] };
		results.forEach((outcome, index) => {
			const id = ids[index];
			if (outcome.status === 'fulfilled') result.deleted.push(id);
			else result.failed.push({ id, error: outcome.reason });
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
		createPreference,
		updatePreference,
		deletePreference,
		deletePreferences,
	};
});
