import { computed } from 'vue';
import { useRoute } from 'vue-router';

import { INSTANCE_AI_THREAD_VIEW } from '@/features/ai/instanceAi/constants';
import { useInstanceAiStore } from '@/features/ai/instanceAi/instanceAi.store';
import { useAgentsN8nChatFlag } from '../composables/useAgentsN8nChatFlag';
import { AGENT_N8N_CHAT_VIEW } from '../constants';
import { useAgentN8nChatThreadsStore } from './n8nChatThreads.store';
import { mergeRecentChats, type RecentChatItem } from './mergeRecentChats';

/** Rows shown in the sidebar's "recent chats" list. */
const SIDEBAR_RECENT_CHATS_LIMIT = 5;

const asRouteParam = (value: unknown): string | undefined =>
	typeof value === 'string' ? value : undefined;

/**
 * The sidebar's recent-chats list: Instance AI threads only when the n8n Chat flag is
 * off, merged with agent n8n Chat threads when it's on — one place for callers (the
 * sidebar) to read instead of branching on the flag themselves.
 */
export function useRecentChats() {
	const route = useRoute();
	const isAgentsN8nChatFlag = useAgentsN8nChatFlag();
	const instanceAiStore = useInstanceAiStore();
	const agentThreadsStore = useAgentN8nChatThreadsStore();

	const openThreadId = computed(() => {
		if (route.name === INSTANCE_AI_THREAD_VIEW) return asRouteParam(route.params.threadId);
		if (route.name === AGENT_N8N_CHAT_VIEW) return asRouteParam(route.params.agentThreadId);
		return undefined;
	});

	const recentChats = computed<RecentChatItem[]>(() =>
		mergeRecentChats(
			instanceAiStore.threads,
			isAgentsN8nChatFlag.value ? agentThreadsStore.recentThreads : [],
			{ limit: SIDEBAR_RECENT_CHATS_LIMIT, openThreadId: openThreadId.value },
		),
	);

	return { recentChats };
}
