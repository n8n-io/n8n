import { computed, onMounted, ref, watch } from 'vue';

import { useAgentsN8nChatFlag } from '@/features/agents/composables/useAgentsN8nChatFlag';
import { useInstanceAiThreadHistory } from '@/features/ai/instanceAi/composables/useInstanceAiThreadHistory';
import { AGENT_N8N_CHAT_HISTORY_PAGE_SIZE } from '../constants';
import { mergeChatHistoryPages, type RecentChatItem } from './mergeRecentChats';
import { usePagedN8nChatThreads } from './usePagedN8nChatThreads';

/**
 * Loads both chat history sources for the "All chats" view and merges them into one
 * recency-ordered, infinite-scrolled list. Assistant paging stays in
 * {@link useInstanceAiThreadHistory}; agent paging is the shared
 * {@link usePagedN8nChatThreads}, since only this view ever pages through every agent's
 * threads at once.
 */
export function useMergedChatHistory() {
	const isAgentsN8nChatFlag = useAgentsN8nChatFlag();
	const agent = usePagedN8nChatThreads({ pageSize: AGENT_N8N_CHAT_HISTORY_PAGE_SIZE });

	const assistant = useInstanceAiThreadHistory({
		onSentinelLoadMore: () => loadMore(),
		isExtraSourceLoading: () => agent.isLoading.value,
	});

	const agentThreadsActive = computed(
		() => isAgentsN8nChatFlag.value && !assistant.history.value.search,
	);

	// Flips once the agent source's first fetch attempt (success or failure) has
	// completed, so the merge cutoff below doesn't treat it as still paging before
	// it's even started — which would hide the assistant list behind an infinite
	// cutoff (see `mergeChatHistoryPages`).
	const agentLoaded = ref(false);
	watch(agent.isLoading, (loading) => {
		if (!loading) agentLoaded.value = true;
	});

	function fetchNextAgentPage(): void {
		if (agentThreadsActive.value) agent.loadNext();
	}

	const items = computed<RecentChatItem[]>(() => {
		const assistantItems: RecentChatItem[] = assistant.history.value.threads.map((thread) => ({
			kind: 'assistant',
			thread,
		}));
		if (!agentThreadsActive.value) return assistantItems;

		const agentItems: RecentChatItem[] = agent.items.value.map((thread) => ({
			kind: 'agent',
			thread,
		}));
		return mergeChatHistoryPages([
			// An unloaded or failed assistant list must not hide the agent threads.
			{
				items: assistantItems,
				hasMore:
					assistant.history.value.hasMore &&
					!assistant.history.value.error &&
					assistantItems.length > 0,
			},
			// Only contributes to the cutoff once its own first page has landed.
			{ items: agentItems, hasMore: agentLoaded.value && agent.hasMore.value },
		]);
	});

	const hasMore = computed(
		() => assistant.history.value.hasMore || (agentThreadsActive.value && agent.hasMore.value),
	);
	const isLoading = computed(() => assistant.history.value.loading);
	const error = computed(
		() => assistant.history.value.error || (agentThreadsActive.value && agent.error.value),
	);

	function loadMore(): void {
		assistant.loadMore();
		fetchNextAgentPage();
	}

	// The flag can turn on after mount (a client-evaluated PostHog flag) — start paging
	// agent threads the moment it does, rather than only on the initial mount.
	watch(agentThreadsActive, (active) => {
		if (active && !agentLoaded.value) fetchNextAgentPage();
	});

	onMounted(fetchNextAgentPage);

	return {
		items,
		hasMore,
		isLoading,
		error,
		history: assistant.history,
		search: assistant.search,
		listRef: assistant.listRef,
		sentinelRef: assistant.sentinelRef,
		loadMore,
	};
}
