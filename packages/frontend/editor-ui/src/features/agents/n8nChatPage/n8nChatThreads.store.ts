import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { STORES } from '@n8n/stores/constants';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { AgentN8nChatThreadSummary } from '@n8n/api-types';

import { getN8nChatThread, listN8nChatThreads } from '../composables/useAgentApi';

/**
 * The user's own n8n Chat threads across every agent they can reach, for the sidebar's
 * "recent chats" list. The "All chats" view's own cursor-paged list lives in
 * {@link useMergedChatHistory}, not here, since only that view ever pages through it.
 */
export const useAgentN8nChatThreadsStore = defineStore(STORES.AGENT_N8N_CHAT_THREADS, () => {
	const rootStore = useRootStore();

	const recentThreads = ref<AgentN8nChatThreadSummary[]>([]);
	// Threads opened by id that the recent list doesn't hold. Kept apart, so a later
	// `fetchRecent` (which replaces `recentThreads`) can't drop them.
	const openedThreads = ref<AgentN8nChatThreadSummary[]>([]);
	/** Every known thread by id; a fresher `recentThreads` entry wins. */
	const threadsById = computed(
		() =>
			new Map(
				[...openedThreads.value, ...recentThreads.value].map((thread) => [thread.id, thread]),
			),
	);

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

	/**
	 * Fetch a thread the store does not know yet, e.g. an older one opened
	 * directly by URL, so the chat history button can still show its title.
	 * Best-effort: a missing title must not break the page, so this swallows
	 * every error instead of throwing.
	 */
	async function loadThread(threadId: string): Promise<void> {
		if (threadsById.value.has(threadId)) return;
		try {
			const thread = await getN8nChatThread(rootStore.restApiContext, threadId);
			if (threadsById.value.has(thread.id)) return;
			openedThreads.value.push(thread);
		} catch (error) {
			console.error('Failed to load n8n Chat thread', error);
		}
	}

	return {
		recentThreads,
		openedThreads,
		threadsById,
		fetchRecent,
		loadThread,
	};
});
