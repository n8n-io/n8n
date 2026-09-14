import type { AiPreferenceRequestDto } from '@n8n/api-types';
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
		fetchPreferences,
		fetchPreferenceCount,
		createPreference,
		updatePreference,
		deletePreference,
		deletePreferences,
	};
});
