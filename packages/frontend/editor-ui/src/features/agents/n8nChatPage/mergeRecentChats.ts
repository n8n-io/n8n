import type { InstanceAiThreadSummary, AgentN8nChatThreadSummary } from '@n8n/api-types';
import type { ActionDropdownItem } from '@n8n/design-system';
import type { useI18n } from '@n8n/i18n';
import { INSTANCE_AI_THREAD_VIEW } from '@/features/ai/instanceAi/constants';
import { AGENT_N8N_CHAT_VIEW } from '../constants';

export type RecentChatItem =
	| { kind: 'assistant'; thread: InstanceAiThreadSummary }
	| { kind: 'agent'; thread: AgentN8nChatThreadSummary };

/** Route to open a sidebar or history chat item on its own page. */
export function chatItemRoute(item: RecentChatItem) {
	if (item.kind === 'assistant') {
		return { name: INSTANCE_AI_THREAD_VIEW, params: { threadId: item.thread.id } };
	}
	return {
		name: AGENT_N8N_CHAT_VIEW,
		params: { agentId: item.thread.agent.id, agentThreadId: item.thread.id },
	};
}

/** Display title for a chat item, falling back to a generic label for an untitled agent thread. */
export function chatItemTitle(item: RecentChatItem, i18n: ReturnType<typeof useI18n>): string {
	if (item.kind === 'assistant') return item.thread.title;
	return item.thread.title ?? i18n.baseText('commandBar.instanceAi.newThread');
}

/** The agent thread row menu, shared by every surface that lists them: delete only. */
export function agentThreadActions(
	i18n: ReturnType<typeof useI18n>,
): Array<ActionDropdownItem<'delete'>> {
	return [
		{ id: 'delete', label: i18n.baseText('instanceAi.sidebar.deleteThread'), icon: 'trash-2' },
	];
}

export type MergeRecentChatsOptions = {
	limit: number;
	/** The currently open thread's id, kept visible past `limit` if already loaded. */
	openThreadId?: string;
};

/**
 * Single-pass merge of two already newest-first lists into one recency-ordered list for
 * the sidebar, stopping at `limit`.
 */
export function mergeRecentChats(
	assistantThreads: InstanceAiThreadSummary[],
	agentThreads: AgentN8nChatThreadSummary[],
	options: MergeRecentChatsOptions,
): RecentChatItem[] {
	const assistantItems = assistantThreads.map((thread) => ({ kind: 'assistant' as const, thread }));
	const agentItems = agentThreads.map((thread) => ({ kind: 'agent' as const, thread }));

	const merged: RecentChatItem[] = [];
	let a = 0;
	let g = 0;
	while (merged.length < options.limit && (a < assistantItems.length || g < agentItems.length)) {
		const useAssistant =
			g >= agentItems.length ||
			(a < assistantItems.length &&
				assistantItems[a].thread.updatedAt >= agentItems[g].thread.updatedAt);
		merged.push(useAssistant ? assistantItems[a++] : agentItems[g++]);
	}

	const openId = options.openThreadId;
	if (!openId || merged.some((item) => item.thread.id === openId)) return merged;

	const openItem = [...assistantItems, ...agentItems].find((item) => item.thread.id === openId);
	if (!openItem) return merged;

	return [...merged.slice(0, Math.max(options.limit - 1, 0)), openItem];
}

/** One source's cursor-paged, already-loaded chat items for {@link mergeChatHistoryPages}. */
export type ChatHistoryPageSource = {
	/** Loaded so far, sorted newest first. */
	items: RecentChatItem[];
	/** Whether this source has further pages it hasn't loaded yet. */
	hasMore: boolean;
};

/**
 * Merges several cursor-paged chat history sources into one recency-ordered list for the
 * "All chats" view's infinite scroll. Stops at the oldest point every still-paging source
 * has loaded down to, so nothing shows out of order while a page is still missing.
 */
export function mergeChatHistoryPages(sources: ChatHistoryPageSource[]): RecentChatItem[] {
	const stillPaging = sources.filter((source) => source.hasMore);
	const cutoff = stillPaging.length
		? Math.max(
				...stillPaging.map((source) => {
					const oldest = source.items.at(-1);
					return oldest ? Date.parse(oldest.thread.updatedAt) : Infinity;
				}),
			)
		: -Infinity;

	return sources
		.flatMap((source) => source.items)
		.filter((item) => Date.parse(item.thread.updatedAt) >= cutoff)
		.sort((a, b) => Date.parse(b.thread.updatedAt) - Date.parse(a.thread.updatedAt));
}
