import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';

import { useAgentsN8nChatFlag } from '@/features/agents/composables/useAgentsN8nChatFlag';
import { useInstanceAiThreadHistory } from '@/features/ai/instanceAi/composables/useInstanceAiThreadHistory';
import { listN8nChatThreads } from '../composables/useAgentApi';
import { AGENT_N8N_CHAT_HISTORY_PAGE_SIZE } from '../constants';
import { mergeChatHistoryPages, type RecentChatItem } from './mergeRecentChats';

/**
 * Loads both chat history sources for the "All chats" view and merges them into one
 * recency-ordered, infinite-scrolled list. Assistant paging stays in
 * {@link useInstanceAiThreadHistory}; agent paging lives entirely here, since only this
 * view ever pages through agent threads (AGENT-957).
 */
export function useMergedChatHistory() {
	const isAgentsN8nChatFlag = useAgentsN8nChatFlag();
	const rootStore = useRootStore();

	const agentItems = ref<RecentChatItem[]>([]);
	const agentHasMore = ref(true);
	const agentLoaded = ref(false);
	const agentError = ref(false);
	let agentCursor: string | undefined;
	let requestVersion = 0;
	const agentInFlight = ref(false);

	const assistant = useInstanceAiThreadHistory({
		onSentinelLoadMore: () => loadMore(),
		isExtraSourceLoading: () => agentInFlight.value,
	});

	const agentThreadsActive = computed(
		() => isAgentsN8nChatFlag.value && !assistant.history.value.search,
	);

	function resetAgentPaging(): void {
		requestVersion += 1; // Drops any response still in flight.
		agentItems.value = [];
		agentHasMore.value = true;
		agentLoaded.value = false;
		agentError.value = false;
		agentCursor = undefined;
		agentInFlight.value = false;
	}

	async function fetchNextAgentPage(): Promise<void> {
		if (!agentThreadsActive.value || !agentHasMore.value || agentInFlight.value) return;
		agentInFlight.value = true;
		const version = requestVersion;
		try {
			const result = await listN8nChatThreads(rootStore.restApiContext, {
				limit: AGENT_N8N_CHAT_HISTORY_PAGE_SIZE,
				cursor: agentCursor,
			});
			if (version !== requestVersion) return;
			const seenIds = new Set(agentItems.value.map((item) => item.thread.id));
			const freshItems = result.data
				.filter((thread) => !seenIds.has(thread.id))
				.map((thread): RecentChatItem => ({ kind: 'agent', thread }));
			agentItems.value = [...agentItems.value, ...freshItems];
			agentCursor = result.nextCursor ?? undefined;
			agentHasMore.value = result.nextCursor !== null;
			agentLoaded.value = true;
		} catch {
			if (version !== requestVersion) return;
			agentHasMore.value = false;
			agentError.value = true;
			agentLoaded.value = true;
		} finally {
			if (version === requestVersion) agentInFlight.value = false;
		}
	}

	const items = computed<RecentChatItem[]>(() => {
		const assistantItems: RecentChatItem[] = assistant.history.value.threads.map((thread) => ({
			kind: 'assistant',
			thread,
		}));
		if (!agentThreadsActive.value) return assistantItems;

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
			{ items: agentItems.value, hasMore: agentLoaded.value && agentHasMore.value },
		]);
	});

	const hasMore = computed(
		() => assistant.history.value.hasMore || (agentThreadsActive.value && agentHasMore.value),
	);
	const isLoading = computed(() => assistant.history.value.loading);
	const error = computed(
		() => assistant.history.value.error || (agentThreadsActive.value && agentError.value),
	);

	function loadMore(): void {
		assistant.loadMore();
		void fetchNextAgentPage();
	}

	// The flag can turn on after mount (a client-evaluated PostHog flag) — start paging
	// agent threads the moment it does, rather than only on the initial mount.
	watch(agentThreadsActive, (active) => {
		if (active && !agentLoaded.value) void fetchNextAgentPage();
	});

	onMounted(() => {
		if (agentThreadsActive.value) void fetchNextAgentPage();
	});
	onBeforeUnmount(resetAgentPaging);

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
