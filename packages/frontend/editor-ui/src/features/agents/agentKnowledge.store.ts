import type { AgentKnowledgeEntry } from '@n8n/api-types';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';

import { getAgentKnowledge } from './composables/useAgentApi';

function keyFor(projectId: string, agentId: string) {
	return `${projectId}:${agentId}`;
}

export const useAgentKnowledgeStore = defineStore('agentKnowledge', () => {
	const entries = ref<AgentKnowledgeEntry[]>([]);
	const enabled = ref(false);
	const loading = ref(false);

	let latestKey: string | null = null;

	async function fetchKnowledge(projectId: string, agentId: string) {
		const key = keyFor(projectId, agentId);
		latestKey = key;
		loading.value = true;

		try {
			const rootStore = useRootStore();
			const response = await getAgentKnowledge(rootStore.restApiContext, projectId, agentId);
			if (latestKey !== key) return;
			enabled.value = response.enabled;
			entries.value = response.entries;
		} finally {
			if (latestKey === key) loading.value = false;
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
