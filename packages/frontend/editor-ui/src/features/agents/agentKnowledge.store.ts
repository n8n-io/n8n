import type { AgentKnowledgeEntry } from '@n8n/api-types';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';

import { getAgentKnowledge } from './composables/useAgentApi';
import { areKnowledgeEntriesEquivalent } from './utils/agent-knowledge';

export const useAgentKnowledgeStore = defineStore('agentKnowledge', () => {
	const entries = ref<AgentKnowledgeEntry[]>([]);
	const enabled = ref(false);
	const loading = ref(false);

	let latestRequestId = 0;
	let latestLoadingRequestId: number | null = null;

	async function fetchKnowledge(
		projectId: string,
		agentId: string,
		options: { silent?: boolean } = {},
	) {
		const requestId = ++latestRequestId;
		if (!options.silent) {
			latestLoadingRequestId = requestId;
			loading.value = true;
		}

		try {
			const rootStore = useRootStore();
			const response = await getAgentKnowledge(rootStore.restApiContext, projectId, agentId);
			if (latestRequestId !== requestId) return;
			enabled.value = response.enabled;
			if (!areKnowledgeEntriesEquivalent(entries.value, response.entries)) {
				entries.value = response.entries;
			}
		} finally {
			if (
				latestLoadingRequestId === requestId ||
				(options.silent && latestRequestId === requestId)
			) {
				latestLoadingRequestId = null;
				loading.value = false;
			}
		}
	}

	function reset() {
		entries.value = [];
		enabled.value = false;
		loading.value = false;
		latestRequestId += 1;
		latestLoadingRequestId = null;
	}

	return {
		entries,
		enabled,
		loading,
		fetchKnowledge,
		reset,
	};
});
