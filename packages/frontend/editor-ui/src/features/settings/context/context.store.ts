import { defineStore } from 'pinia';
import { ref } from 'vue';

import { useRootStore } from '@n8n/stores/useRootStore';

import * as api from './context.api';
import type { Preference, PreferenceListQuery, PreferencePayload } from './context.types';

export type BulkDeleteResult = {
	deleted: string[];
	failed: Array<{ id: string; error: unknown }>;
};

export const useContextStore = defineStore('context', () => {
	const rootStore = useRootStore();

	/** Rows for the page currently shown, not the whole collection. */
	const preferences = ref<Preference[]>([]);
	const count = ref(0);
	const loading = ref(false);

	/**
	 * Bumped after every successful write. The create/edit modal is mounted by the
	 * global modal root rather than by the list, so it cannot emit to the list. The
	 * list watches this instead and reloads the page it is showing.
	 */
	const changeVersion = ref(0);

	/*
	 * Reads land in completion order, not the order they were asked for, so a slow
	 * earlier read could overwrite a newer one — a reload after a write racing the
	 * page load it interrupted, for instance. Only the newest read commits.
	 *
	 * One counter per thing written, because the two readers do not write the same
	 * things. A count read must not take ownership of `loading` away from a list
	 * read in flight, or nothing would ever clear it.
	 */

	/** Guards the rows and the loading flag. Only a list read owns these. */
	let latestListRead = 0;
	/** Guards the total, which both readers write. */
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
			// A superseded list read must not clear the flag out from under the newer one.
			if (listRead === latestListRead) loading.value = false;
		}
	}

	/** Reads the collection size alone. The landing page shows only the count. */
	async function fetchPreferenceCount() {
		const countRead = ++latestCountRead;
		const total = await api.getPreferenceCount(rootStore.restApiContext);
		if (countRead === latestCountRead) count.value = total;
		return total;
	}

	async function createPreference(payload: PreferencePayload) {
		const created = await api.createPreference(rootStore.restApiContext, payload);
		changeVersion.value += 1;
		return created;
	}

	async function updatePreference(id: string, payload: PreferencePayload) {
		const updated = await api.updatePreference(rootStore.restApiContext, id, payload);
		changeVersion.value += 1;
		return updated;
	}

	async function deletePreference(id: string) {
		await api.deletePreference(rootStore.restApiContext, id);
		changeVersion.value += 1;
	}

	/**
	 * Deletes every row it can and reports the rest, so one failed row does not
	 * leave the others behind, and the caller knows which ids are gone.
	 */
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
		// Signal once for the run, never per row, and only when the collection changed.
		if (result.deleted.length > 0) changeVersion.value += 1;
		return result;
	}

	return {
		preferences,
		count,
		loading,
		changeVersion,
		fetchPreferences,
		fetchPreferenceCount,
		createPreference,
		updatePreference,
		deletePreference,
		deletePreferences,
	};
});
