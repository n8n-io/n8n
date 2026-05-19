import type { AgentKnowledgeEntry } from '@n8n/api-types';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';

import { getAgentKnowledge } from './composables/useAgentApi';
import { areKnowledgeEntriesEquivalent } from './utils/agent-knowledge';

function keyFor(projectId: string, agentId: string) {
	return `${projectId}:${agentId}`;
}

export const useAgentKnowledgeStore = defineStore('agentKnowledge', () => {
	const entries = ref<AgentKnowledgeEntry[]>([]);
	const enabled = ref(false);
	const loading = ref(false);

	let latestKey: string | null = null;

	async function fetchKnowledge(
		projectId: string,
		agentId: string,
		options: { silent?: boolean } = {},
	) {
		const key = keyFor(projectId, agentId);
		latestKey = key;
		if (!options.silent) loading.value = true;

		try {
			const rootStore = useRootStore();
			const response = await getAgentKnowledge(rootStore.restApiContext, projectId, agentId);
			if (latestKey !== key) return;
			enabled.value = response.enabled;
			if (!areKnowledgeEntriesEquivalent(entries.value, response.entries)) {
				entries.value = response.entries;
			}
		} finally {
			if (!options.silent && latestKey === key) loading.value = false;
		}
	}

	function reset() {
		entries.value = [];
		enabled.value = false;
		loading.value = false;
		latestKey = null;
	}

	return {
		entries,
		enabled,
		loading,
		fetchKnowledge,
		reset,
	};
});
