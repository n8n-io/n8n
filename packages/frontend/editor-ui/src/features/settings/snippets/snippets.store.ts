import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { SnippetSources } from 'n8n-workflow';
import { useRootStore } from '@n8n/stores/useRootStore';

import * as snippetsApi from './snippets.api';
import type { SnippetResource, CreateSnippet, UpdateSnippet } from './snippets.types';

export const useSnippetsStore = defineStore('snippets', () => {
	const rootStore = useRootStore();

	const allSnippets = ref<SnippetResource[]>([]);

	async function fetchAll() {
		try {
			allSnippets.value = await snippetsApi.getSnippets(rootStore.restApiContext);
		} catch {
			// Module disabled or no list permission — expressions fall back to runtime resolution
			allSnippets.value = [];
		}
		return allSnippets.value;
	}

	/** Raw sources for local expression preview, scoped to a workflow's home project. */
	function sourcesForProject(projectId?: string | null): SnippetSources {
		const sources: SnippetSources = { global: {}, project: {} };
		for (const snippet of allSnippets.value) {
			if (!snippet.project) sources.global[snippet.name] = snippet.code;
			else if (projectId && snippet.project.id === projectId)
				sources.project[snippet.name] = snippet.code;
		}
		return sources;
	}

	async function createSnippet(data: CreateSnippet) {
		const created = await snippetsApi.createSnippet(rootStore.restApiContext, data);
		allSnippets.value = [...allSnippets.value, created];
		return created;
	}

	async function updateSnippet(data: UpdateSnippet) {
		const updated = await snippetsApi.updateSnippet(rootStore.restApiContext, data);
		allSnippets.value = allSnippets.value.map((snippet) =>
			snippet.id === updated.id ? updated : snippet,
		);
		return updated;
	}

	async function deleteSnippet(id: string) {
		await snippetsApi.deleteSnippet(rootStore.restApiContext, { id });
		allSnippets.value = allSnippets.value.filter((snippet) => snippet.id !== id);
	}

	return {
		allSnippets,
		fetchAll,
		sourcesForProject,
		createSnippet,
		updateSnippet,
		deleteSnippet,
	};
});
