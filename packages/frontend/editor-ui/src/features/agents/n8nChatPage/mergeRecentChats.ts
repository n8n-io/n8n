import type {
	InstanceAiThreadSummary,
	AgentN8nChatThreadSummary,
	SystemAgentThreadSummary,
} from '@n8n/api-types';
import type { ActionDropdownItem } from '@n8n/design-system';
import type { useI18n } from '@n8n/i18n';
import { INSTANCE_AI_THREAD_VIEW } from '@/features/ai/instanceAi/constants';
import { AGENT_N8N_CHAT_VIEW } from '../constants';

/**
 * A chat in the sidebar or the history. `assistant-agent` is an n8n Assistant thread
 * on the agents runtime. It opens at the same URL as an `assistant` thread.
 */
export type RecentChatItem =
	| { kind: 'assistant'; thread: InstanceAiThreadSummary }
	| { kind: 'assistant-agent'; thread: SystemAgentThreadSummary }
	| { kind: 'agent'; thread: AgentN8nChatThreadSummary };

/** Route to open a sidebar or history chat item on its own page. */
export function chatItemRoute(item: RecentChatItem) {
	if (item.kind === 'assistant' || item.kind === 'assistant-agent') {
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

/** Whether the item is an n8n Assistant thread, on either runtime. */
export function isAssistantChatItem(
	item: RecentChatItem,
): item is Extract<RecentChatItem, { kind: 'assistant' | 'assistant-agent' }> {
	return item.kind === 'assistant' || item.kind === 'assistant-agent';
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
	/** n8n Assistant threads on the agents runtime, newest first. */
	assistantAgentThreads?: SystemAgentThreadSummary[];
};

/**
 * Single-pass merge of already newest-first lists into one recency-ordered list for
 * the sidebar, stopping at `limit`. On equal times, the Assistant threads come first.
 */
export function mergeRecentChats(
	assistantThreads: InstanceAiThreadSummary[],
	agentThreads: AgentN8nChatThreadSummary[],
	options: MergeRecentChatsOptions,
): RecentChatItem[] {
	const lists: RecentChatItem[][] = [
		assistantThreads.map((thread) => ({ kind: 'assistant' as const, thread })),
		(options.assistantAgentThreads ?? []).map((thread) => ({
			kind: 'assistant-agent' as const,
			thread,
		})),
		agentThreads.map((thread) => ({ kind: 'agent' as const, thread })),
	];
	// A thread without an update time sorts as the oldest.
	const updatedAtOf = (item: RecentChatItem) => item.thread.updatedAt ?? '';

	const merged: RecentChatItem[] = [];
	const positions = lists.map(() => 0);
	while (merged.length < options.limit) {
		let next = -1;
		for (let index = 0; index < lists.length; index++) {
			const head = lists[index][positions[index]];
			if (!head) continue;
			if (next === -1 || updatedAtOf(head) > updatedAtOf(lists[next][positions[next]])) {
				next = index;
			}
		}
		if (next === -1) break;
		merged.push(lists[next][positions[next]++]);
	}

	const openId = options.openThreadId;
	if (!openId || merged.some((item) => item.thread.id === openId)) return merged;

	const openItem = lists.flat().find((item) => item.thread.id === openId);
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
