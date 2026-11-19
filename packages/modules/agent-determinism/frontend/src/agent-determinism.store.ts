import type { DeterminismSuggestion } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { GeneratedFromSourceType } from 'n8n-workflow';
import { defineStore } from 'pinia';
import { ref } from 'vue';

import { listDeterminismSuggestions } from './agent-determinism.api';

type ListKey = `${string}:${GeneratedFromSourceType}`;

export const useDeterminismSuggestionsStore = defineStore('agentDeterminismSuggestions', () => {
	const rootStore = useRootStore();
	const suggestionsByList = ref<Record<ListKey, Record<string, DeterminismSuggestion>>>({});
	const pending = new Map<ListKey, Promise<void>>();

	async function ensureLoaded(projectId: string, sourceType: GeneratedFromSourceType) {
		const key: ListKey = `${projectId}:${sourceType}`;
		if (suggestionsByList.value[key]) return;
		if (!pending.has(key)) {
			pending.set(
				key,
				listDeterminismSuggestions(rootStore.restApiContext, projectId, sourceType)
					.then(({ suggestions }) => {
						suggestionsByList.value[key] = suggestions;
					})
					.catch(() => {
						suggestionsByList.value[key] = {};
					})
					.finally(() => pending.delete(key)),
			);
		}
		await pending.get(key);
	}

	function suggestionFor(projectId: string, sourceType: GeneratedFromSourceType, sourceId: string) {
		return suggestionsByList.value[`${projectId}:${sourceType}`]?.[sourceId] ?? null;
	}

	function forget(projectId: string, sourceType: GeneratedFromSourceType, sourceId: string) {
		delete suggestionsByList.value[`${projectId}:${sourceType}`]?.[sourceId];
	}

	return { ensureLoaded, suggestionFor, forget };
});
