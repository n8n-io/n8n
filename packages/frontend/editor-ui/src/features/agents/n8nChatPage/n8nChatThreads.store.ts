import { defineStore } from 'pinia';
import { ref } from 'vue';
import { STORES } from '@n8n/stores/constants';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { AgentN8nChatThreadSummary } from '@n8n/api-types';

import { listN8nChatThreads } from '../composables/useAgentApi';

/**
 * The user's own n8n Chat threads across every agent they can reach, for the sidebar's
 * "recent chats" list. The "All chats" view's own cursor-paged list lives in
 * {@link useMergedChatHistory}, not here, since only that view ever pages through it.
 */
export const useAgentN8nChatThreadsStore = defineStore(STORES.AGENT_N8N_CHAT_THREADS, () => {
	const rootStore = useRootStore();

	const recentThreads = ref<AgentN8nChatThreadSummary[]>([]);

	// Dropped responses from an older call never clobber a newer one.
	let requestVersion = 0;

	async function fetchRecent(limit: number): Promise<void> {
		const version = ++requestVersion;
		try {
			const result = await listN8nChatThreads(rootStore.restApiContext, { limit });
			if (version !== requestVersion) return;
			recentThreads.value = result.data;
		} catch (error) {
			// Best-effort: keep whatever was already shown rather than clearing the sidebar.
			if (version !== requestVersion) return;
			console.error('Failed to load n8n Chat threads', error);
		}
	}

	return {
		recentThreads,
		fetchRecent,
	};
});
