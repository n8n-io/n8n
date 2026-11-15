import { computed, onMounted, ref, toValue, watch, type MaybeRefOrGetter } from 'vue';

import { useAgentsN8nChatFlag } from '@/features/agents/composables/useAgentsN8nChatFlag';
import { ASSISTANT_AGENT_HISTORY_PAGE_SIZE } from '@/features/ai/instanceAi/assistantAgent/assistantAgentThreads.store';
import { usePagedAssistantAgentThreads } from '@/features/ai/instanceAi/assistantAgent/usePagedAssistantAgentThreads';
import { useInstanceAiThreadHistory } from '@/features/ai/instanceAi/composables/useInstanceAiThreadHistory';
import { useInstanceAiStore } from '@/features/ai/instanceAi/instanceAi.store';
import { useInstanceAiSettingsStore } from '@/features/ai/instanceAi/instanceAiSettings.store';
import { AGENT_N8N_CHAT_HISTORY_PAGE_SIZE } from '../constants';
import {
	mergeChatHistoryPages,
	type ChatHistoryPageSource,
	type RecentChatItem,
} from './mergeRecentChats';
import { usePagedN8nChatThreads } from './usePagedN8nChatThreads';

export type UseMergedChatHistoryOptions = {
	/** Gates agent-thread paging and merging. Defaults to the n8n Chat flag alone, which is
	 * what the "All chats" view wants — a caller with a narrower condition (e.g. only while
	 * searching) passes its own. */
	enabled?: MaybeRefOrGetter<boolean>;
	/** Gates the n8n Assistant threads on the agents runtime. Defaults to whether the
	 * Assistant agent is on. */
	assistantAgentEnabled?: MaybeRefOrGetter<boolean>;
};

/**
 * Loads both chat history sources and merges them into one recency-ordered,
 * infinite-scrolled list. Assistant paging stays in {@link useInstanceAiThreadHistory};
 * agent paging is the shared {@link usePagedN8nChatThreads}.
 */
export function useMergedChatHistory(options?: UseMergedChatHistoryOptions) {
	const isAgentsN8nChatFlag = useAgentsN8nChatFlag();
	// The committed search term lives in the store; both sources key off it.
	const instanceAiStore = useInstanceAiStore();
	const enabled = computed(() => toValue(options?.enabled ?? isAgentsN8nChatFlag));
	const instanceAiSettingsStore = useInstanceAiSettingsStore();
	const assistantAgentEnabled = computed(() =>
		toValue(options?.assistantAgentEnabled ?? instanceAiSettingsStore.isAssistantAgentEnabled),
	);

	// Shares the Assistant search's debounced term, so both sources requery together. Hides
	// the search from the pager while disabled, so a search never fetches agent threads for
	// a caller that can't show them.
	const agent = usePagedN8nChatThreads({
		pageSize: AGENT_N8N_CHAT_HISTORY_PAGE_SIZE,
		enabled,
		search: () => (enabled.value ? instanceAiStore.threadHistory.search || undefined : undefined),
	});

	const assistantAgent = usePagedAssistantAgentThreads({
		pageSize: ASSISTANT_AGENT_HISTORY_PAGE_SIZE,
		enabled: assistantAgentEnabled,
		search: () =>
			assistantAgentEnabled.value ? instanceAiStore.threadHistory.search || undefined : undefined,
	});

	const assistant = useInstanceAiThreadHistory({
		onSentinelLoadMore: () => loadMore(),
		isExtraSourceLoading: () =>
			(enabled.value && agent.isLoading.value) ||
			(assistantAgentEnabled.value && assistantAgent.isLoading.value),
	});

	// Flips once the agent source's first fetch attempt (success or failure) has
	// completed, so the merge cutoff below doesn't treat it as still paging before
	// it's even started — which would hide the assistant list behind an infinite
	// cutoff (see `mergeChatHistoryPages`). A new search term starts over.
	const agentLoaded = ref(false);
	watch(agent.isLoading, (loading) => {
		if (!loading) agentLoaded.value = true;
	});
	// The same for the Assistant agent threads.
	const assistantAgentLoaded = ref(false);
	watch(assistantAgent.isLoading, (loading) => {
		if (!loading) assistantAgentLoaded.value = true;
	});
	watch(
		() => instanceAiStore.threadHistory.search,
		() => {
			agentLoaded.value = false;
			assistantAgentLoaded.value = false;
		},
	);

	const items = computed<RecentChatItem[]>(() => {
		const assistantItems: RecentChatItem[] = assistant.history.value.threads.map((thread) => ({
			kind: 'assistant',
			thread,
		}));
		if (!enabled.value && !assistantAgentEnabled.value) return assistantItems;

		const sources: ChatHistoryPageSource[] = [
			// An unloaded or failed assistant list must not hide the agent threads.
			{
				items: assistantItems,
				hasMore:
					assistant.history.value.hasMore &&
					!assistant.history.value.error &&
					assistantItems.length > 0,
			},
		];
		if (assistantAgentEnabled.value) {
			sources.push({
				items: assistantAgent.items.value.map((thread) => ({ kind: 'assistant-agent', thread })),
				hasMore: assistantAgentLoaded.value && assistantAgent.hasMore.value,
			});
		}
		if (enabled.value) {
			// Only contributes to the cutoff once its own first page has landed.
			sources.push({
				items: agent.items.value.map((thread) => ({ kind: 'agent', thread })),
				hasMore: agentLoaded.value && agent.hasMore.value,
			});
		}
		return mergeChatHistoryPages(sources);
	});

	const hasMore = computed(
		() =>
			assistant.history.value.hasMore ||
			(enabled.value && agent.hasMore.value) ||
			(assistantAgentEnabled.value && assistantAgent.hasMore.value),
	);
	const isLoading = computed(
		() =>
			assistant.history.value.loading ||
			(enabled.value && agent.isLoading.value) ||
			(assistantAgentEnabled.value && assistantAgent.isLoading.value),
	);
	const error = computed(
		() =>
			assistant.history.value.error ||
			(enabled.value && agent.error.value) ||
			(assistantAgentEnabled.value && assistantAgent.error.value),
	);

	function loadMore(): void {
		assistant.loadMore();
		// No-ops while disabled — both pagers gate this themselves.
		agent.loadNext();
		assistantAgent.loadNext();
	}

	// `enabled` can turn true after mount (a client-evaluated PostHog flag, or a caller's own
	// condition becoming true) — start paging agent threads the moment it does, rather than
	// only on the initial mount.
	watch(enabled, (active) => {
		if (active && !agentLoaded.value) agent.loadNext();
	});
	watch(assistantAgentEnabled, (active) => {
		if (active && !assistantAgentLoaded.value) assistantAgent.loadNext();
	});

	onMounted(() => {
		agent.loadNext();
		assistantAgent.loadNext();
	});

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
