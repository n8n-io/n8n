import type { PushPayload, SystemAgentThreadSummary } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { i18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import {
	deleteSystemAgentThread,
	getSystemAgentThread,
	listSystemAgentThreads,
	renameSystemAgentThread,
} from '@/features/agents/composables/useAgentApi';

import { fetchAssistantAgentThreadCredits } from './assistantAgentTabs.api';
import {
	ASSISTANT_AGENT_ID,
	forgetAssistantAgentThread,
	rememberAssistantAgentThread,
} from './assistantAgentThreads';

/** The thread with its title from a rename in this session, if any. */
export function withRenamedTitle(
	thread: SystemAgentThreadSummary,
	renamedTitles: ReadonlyMap<string, string>,
): SystemAgentThreadSummary {
	const title = renamedTitles.get(thread.id);
	return title === undefined ? thread : { ...thread, title };
}

/** How many Assistant agent threads the sidebar's recent chats load. */
export const ASSISTANT_AGENT_RECENT_THREADS_LIMIT = 10;

/** Page size of the Assistant agent threads in the chat history. */
export const ASSISTANT_AGENT_HISTORY_PAGE_SIZE = 30;

/**
 * The user's own Assistant agent threads for the recent chats. The chat history
 * pages through them with {@link usePagedAssistantAgentThreads}. Every thread
 * that it loads is remembered as an Assistant agent thread, so opening it needs
 * no lookup.
 */
export const useAssistantAgentThreadsStore = defineStore('assistantAgentThreads', () => {
	const rootStore = useRootStore();
	const toast = useToast();

	const recentThreads = ref<SystemAgentThreadSummary[]>([]);
	// Threads opened by id that the recent list does not hold. A later `fetchRecent`
	// replaces `recentThreads`, so it cannot drop them.
	const openedThreads = ref<SystemAgentThreadSummary[]>([]);
	/** Ids deleted in this session, so every mounted list filters the row out. */
	const deletedThreadIds = ref<Set<string>>(new Set());
	/**
	 * Titles renamed in this session, so every mounted list shows the new title. A
	 * response that a rename overtook can still hold the old title.
	 */
	const renamedTitles = ref<Map<string, string>>(new Map());
	/** The credit total of each thread, from its load and the credit pushes. */
	const creditsUsed = ref<Map<string, number>>(new Map());
	const threadsById = computed(
		() =>
			new Map(
				[...openedThreads.value, ...recentThreads.value]
					.filter((thread) => !deletedThreadIds.value.has(thread.id))
					.map((thread) => [thread.id, withRenamedTitle(thread, renamedTitles.value)]),
			),
	);
	/** Every known thread, newest `updatedAt` first. */
	const knownThreads = computed(() =>
		[...threadsById.value.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
	);

	// A response that a delete overtook can still hold the deleted thread.
	function remember(threads: SystemAgentThreadSummary[]): void {
		for (const thread of threads) {
			if (!deletedThreadIds.value.has(thread.id)) {
				rememberAssistantAgentThread(thread.id, thread.projectId);
			}
		}
	}

	// A response of an older call never replaces a newer one.
	let requestVersion = 0;

	async function fetchRecent(limit = ASSISTANT_AGENT_RECENT_THREADS_LIMIT): Promise<void> {
		const version = ++requestVersion;
		try {
			const result = await listSystemAgentThreads(rootStore.restApiContext, ASSISTANT_AGENT_ID, {
				limit,
			});
			if (version !== requestVersion) return;
			remember(result.data);
			recentThreads.value = result.data;
		} catch (error) {
			// Best effort: keep what the list shows.
			if (version !== requestVersion) return;
			console.error('Failed to load Assistant agent threads', error);
		}
	}

	/** Adds a thread that the recent list does not hold, for example one opened by URL. */
	function addOpenedThread(thread: SystemAgentThreadSummary): void {
		if (threadsById.value.has(thread.id) || deletedThreadIds.value.has(thread.id)) return;
		remember([thread]);
		openedThreads.value.push(thread);
	}

	/**
	 * Loads and adds a thread that the store does not hold yet. A new thread can load
	 * while its first message is still queued, before the server has its preview. Pass
	 * the sent text as `firstMessage` so that the lists show it until the title arrives.
	 */
	async function loadThread(threadId: string, firstMessage?: string): Promise<void> {
		if (threadsById.value.has(threadId)) return;
		try {
			const thread = await getSystemAgentThread(
				rootStore.restApiContext,
				ASSISTANT_AGENT_ID,
				threadId,
			);
			addOpenedThread({ ...thread, firstMessage: thread.firstMessage ?? firstMessage ?? null });
		} catch (error) {
			console.error('Failed to load Assistant agent thread', error);
		}
	}

	async function deleteThread(thread: SystemAgentThreadSummary): Promise<boolean> {
		try {
			await deleteSystemAgentThread(rootStore.restApiContext, ASSISTANT_AGENT_ID, thread.id);
		} catch (error) {
			toast.showError(error, i18n.baseText('agentSessions.showError.delete'));
			return false;
		}
		recentThreads.value = recentThreads.value.filter((t) => t.id !== thread.id);
		openedThreads.value = openedThreads.value.filter((t) => t.id !== thread.id);
		deletedThreadIds.value.add(thread.id);
		creditsUsed.value.delete(thread.id);
		forgetAssistantAgentThread(thread.id);
		return true;
	}

	// The latest rename of each thread. Only it can restore the old title.
	const renameVersions = new Map<string, number>();

	/** Shows the new title at once, and restores the old one when the request fails. */
	async function renameThread(threadId: string, title: string): Promise<void> {
		const previous = renamedTitles.value.get(threadId);
		const version = (renameVersions.get(threadId) ?? 0) + 1;
		renameVersions.set(threadId, version);
		renamedTitles.value.set(threadId, title);
		try {
			await renameSystemAgentThread(rootStore.restApiContext, ASSISTANT_AGENT_ID, threadId, title);
		} catch (error) {
			if (renameVersions.get(threadId) === version) {
				if (previous === undefined) renamedTitles.value.delete(threadId);
				else renamedTitles.value.set(threadId, previous);
			}
			throw error;
		}
	}

	/**
	 * Shows a title that title generation stored, from its push. The title can come
	 * while the first turn still runs, so the lists do not wait for the turn to end.
	 * A rename in this session still wins, through `renamedTitles`.
	 */
	function applyGeneratedTitle({
		agentId,
		threadId,
		title,
	}: PushPayload<'agentThreadTitleUpdated'>): void {
		if (agentId !== ASSISTANT_AGENT_ID || deletedThreadIds.value.has(threadId)) return;
		if (!threadsById.value.has(threadId)) {
			// The lists do not hold the thread yet. Its load returns the stored title.
			void loadThread(threadId);
			return;
		}
		const retitle = (threads: SystemAgentThreadSummary[]) =>
			threads.map((thread) => (thread.id === threadId ? { ...thread, title } : thread));
		recentThreads.value = retitle(recentThreads.value);
		openedThreads.value = retitle(openedThreads.value);
	}

	/** The credit total of a thread, or `undefined` before its first claim. */
	function threadCreditsUsed(threadId: string): number | undefined {
		return creditsUsed.value.get(threadId);
	}

	/**
	 * Keeps the larger total. A total only grows, so a load that a push overtook
	 * cannot show an older total.
	 */
	function setThreadCreditsUsed(threadId: string, total: number): void {
		const current = creditsUsed.value.get(threadId);
		if (current === undefined || total > current) creditsUsed.value.set(threadId, total);
	}

	/**
	 * Loads the stored credit total of a thread, so the total shows after a reload.
	 * Returns `false` when the load failed, so the caller does not read a missing total as zero.
	 */
	async function loadThreadCredits(threadId: string): Promise<boolean> {
		try {
			const { creditsUsed: total } = await fetchAssistantAgentThreadCredits(
				rootStore.restApiContext,
				threadId,
			);
			if (total !== null) setThreadCreditsUsed(threadId, total);
			return true;
		} catch (error) {
			// Best effort: the header shows no thread total.
			console.error('Failed to load Assistant agent thread credits', error);
			return false;
		}
	}

	return {
		recentThreads,
		openedThreads,
		threadsById,
		knownThreads,
		deletedThreadIds,
		renamedTitles,
		remember,
		fetchRecent,
		addOpenedThread,
		loadThread,
		deleteThread,
		renameThread,
		applyGeneratedTitle,
		threadCreditsUsed,
		setThreadCreditsUsed,
		loadThreadCredits,
	};
});
