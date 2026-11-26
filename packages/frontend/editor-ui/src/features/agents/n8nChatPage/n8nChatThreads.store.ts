import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { STORES } from '@n8n/stores/constants';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@n8n/composables/useToast';
import { i18n } from '@n8n/i18n';
import type { AgentN8nChatThreadSummary } from '@n8n/api-types';

import {
	deleteN8nChatThread,
	getN8nChatThread,
	listN8nChatThreads,
} from '../composables/useAgentApi';
import {
	useAgentThreadTitleUpdates,
	type AgentThreadTitleUpdate,
} from '../composables/useAgentThreadTitleUpdates';

/**
 * The user's own n8n Chat threads across every agent they can reach, for the sidebar's
 * "recent chats" list. The "All chats" view's own cursor-paged list lives in
 * {@link useMergedChatHistory}, not here, since only that view ever pages through it.
 */
export const useAgentN8nChatThreadsStore = defineStore(STORES.AGENT_N8N_CHAT_THREADS, () => {
	const rootStore = useRootStore();
	const toast = useToast();

	const recentThreads = ref<AgentN8nChatThreadSummary[]>([]);
	// Threads opened by id that the recent list doesn't hold. Kept apart, so a later
	// `fetchRecent` (which replaces `recentThreads`) can't drop them.
	const openedThreads = ref<AgentN8nChatThreadSummary[]>([]);
	/** Ids deleted this session, so every already-mounted list (recent, paged, merged) can
	 * filter a row out without each one separately tracking and removing it. */
	const deletedThreadIds = ref<Set<string>>(new Set());
	/** Every known thread by id; a fresher `recentThreads` entry wins. Skips deleted threads,
	 * so a list response that was already in flight cannot bring one back. */
	const threadsById = computed(
		() =>
			new Map(
				[...openedThreads.value, ...recentThreads.value]
					.filter((thread) => !deletedThreadIds.value.has(thread.id))
					.map((thread) => [thread.id, thread]),
			),
	);
	/** Every known thread, newest `updatedAt` first — the single source for callers that
	 * merge this store's threads into a recency-ordered list (the sidebar, the dropdown). */
	const knownThreads = computed(() =>
		[...threadsById.value.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
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
	async function loadThread(threadId: string, firstMessage?: string): Promise<void> {
		if (threadsById.value.has(threadId)) return;
		try {
			const thread = await getN8nChatThread(rootStore.restApiContext, threadId);
			if (threadsById.value.has(thread.id)) return;
			// A new chat can load while its first message is still queued, before the
			// server has its preview. The sent text stands in until the title arrives.
			openedThreads.value.push({
				...thread,
				firstMessage: thread.firstMessage ?? firstMessage ?? null,
			});
		} catch (error) {
			console.error('Failed to load n8n Chat thread', error);
		}
	}

	/**
	 * Shows a generated title as soon as the server stores it, before the turn ends.
	 * Ignores threads that this store does not hold, such as preview sessions of the
	 * agent builder: only n8n Chat threads can load through this store.
	 */
	function applyGeneratedTitle({ projectId, agentId, threadId, title }: AgentThreadTitleUpdate) {
		const retitle = (threads: AgentN8nChatThreadSummary[]) =>
			threads.map((thread) =>
				thread.id === threadId &&
				thread.agent.id === agentId &&
				thread.agent.projectId === projectId
					? { ...thread, title }
					: thread,
			);
		recentThreads.value = retitle(recentThreads.value);
		openedThreads.value = retitle(openedThreads.value);
	}

	useAgentThreadTitleUpdates(applyGeneratedTitle);

	/**
	 * Delete one of the user's own threads, like the preview chat deletes sessions.
	 * Rename is out of scope — the preview chat has none either. Takes the thread itself,
	 * not just its id, so a thread a pager loaded past the recent page can still delete.
	 */
	async function deleteThread(thread: AgentN8nChatThreadSummary): Promise<boolean> {
		try {
			await deleteN8nChatThread(
				rootStore.restApiContext,
				thread.agent.projectId,
				thread.agent.id,
				thread.id,
			);
		} catch (error) {
			toast.showError(error, i18n.baseText('agentSessions.showError.delete'));
			return false;
		}
		recentThreads.value = recentThreads.value.filter((t) => t.id !== thread.id);
		openedThreads.value = openedThreads.value.filter((t) => t.id !== thread.id);
		deletedThreadIds.value.add(thread.id);
		return true;
	}

	return {
		recentThreads,
		openedThreads,
		threadsById,
		knownThreads,
		deletedThreadIds,
		fetchRecent,
		loadThread,
		applyGeneratedTitle,
		deleteThread,
	};
});
