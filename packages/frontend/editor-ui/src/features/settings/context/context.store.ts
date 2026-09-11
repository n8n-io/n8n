import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { useRootStore } from '@n8n/stores/useRootStore';

import * as api from './context.api';
import type { Preference, PreferenceListQuery, PreferencePayload } from './context.types';

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

	const isEmpty = computed(() => count.value === 0);

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

	/**
	 * Reads the collection size without holding a page of rows. The landing page shows
	 * only the count, so it asks for a single row.
	 */
	async function fetchPreferenceCount() {
		const countRead = ++latestCountRead;
		const response = await api.getPreferences(rootStore.restApiContext, { skip: 0, take: 1 });
		if (countRead === latestCountRead) count.value = response.count;
		return response.count;
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

	async function deletePreferences(ids: string[]) {
		let deleted = 0;
		try {
			for (const id of ids) {
				await api.deletePreference(rootStore.restApiContext, id);
				deleted += 1;
			}
		} finally {
			// A run that fails part way still changed the collection, and the rows it
			// removed are still on screen. Signal once either way, never per row.
			if (deleted > 0) changeVersion.value += 1;
		}
	}

	return {
		preferences,
		count,
		loading,
		changeVersion,
		isEmpty,
		fetchPreferences,
		fetchPreferenceCount,
		createPreference,
		updatePreference,
		deletePreference,
		deletePreferences,
	};
});
