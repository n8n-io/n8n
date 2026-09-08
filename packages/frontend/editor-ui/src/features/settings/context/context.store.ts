import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { useRootStore } from '@n8n/stores/useRootStore';

import * as api from './context.api';
import type {
	CreatePreferencePayload,
	Preference,
	PreferenceListQuery,
	UpdatePreferencePayload,
} from './context.types';

export const useContextStore = defineStore('context', () => {
	const rootStore = useRootStore();

	/** Rows for the page currently shown, not the whole collection. */
	const preferences = ref<Preference[]>([]);
	const count = ref(0);
	const loading = ref(false);

	const isEmpty = computed(() => count.value === 0);

	async function fetchPreferences(query: PreferenceListQuery = {}) {
		loading.value = true;
		try {
			const response = await api.getPreferences(rootStore.restApiContext, query);
			preferences.value = response.data;
			count.value = response.count;
			return response;
		} finally {
			loading.value = false;
		}
	}

	/**
	 * Reads the collection size without holding a page of rows. The landing page shows
	 * only the count, so it asks for a single row.
	 */
	async function fetchPreferenceCount() {
		const response = await api.getPreferences(rootStore.restApiContext, { skip: 0, take: 1 });
		count.value = response.count;
		return response.count;
	}

	async function createPreference(payload: CreatePreferencePayload) {
		return await api.createPreference(rootStore.restApiContext, payload);
	}

	async function updatePreference(id: string, payload: UpdatePreferencePayload) {
		return await api.updatePreference(rootStore.restApiContext, id, payload);
	}

	async function deletePreference(id: string) {
		await api.deletePreference(rootStore.restApiContext, id);
	}

	async function deletePreferences(ids: string[]) {
		for (const id of ids) {
			await api.deletePreference(rootStore.restApiContext, id);
		}
	}

	return {
		preferences,
		count,
		loading,
		isEmpty,
		fetchPreferences,
		fetchPreferenceCount,
		createPreference,
		updatePreference,
		deletePreference,
		deletePreferences,
	};
});
