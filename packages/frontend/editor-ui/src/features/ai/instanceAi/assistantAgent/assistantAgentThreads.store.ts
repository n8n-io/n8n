import type { SystemAgentThreadSummary } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { i18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import {
	deleteSystemAgentThread,
	getSystemAgentThread,
	listSystemAgentThreads,
} from '@/features/agents/composables/useAgentApi';

import { ASSISTANT_AGENT_ID, rememberAssistantAgentThread } from './assistantAgentThreads';

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
	const threadsById = computed(
		() =>
			new Map(
				[...openedThreads.value, ...recentThreads.value]
					.filter((thread) => !deletedThreadIds.value.has(thread.id))
					.map((thread) => [thread.id, thread]),
			),
	);
	/** Every known thread, newest `updatedAt` first. */
	const knownThreads = computed(() =>
		[...threadsById.value.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
	);

	function remember(threads: SystemAgentThreadSummary[]): void {
		for (const thread of threads) rememberAssistantAgentThread(thread.id, thread.projectId);
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
	async function loadThread(threadId: string): Promise<void> {
		if (threadsById.value.has(threadId)) return;
		try {
			const thread = await getSystemAgentThread(
				rootStore.restApiContext,
				ASSISTANT_AGENT_ID,
				threadId,
			);
			if (threadsById.value.has(thread.id)) return;
			remember([thread]);
			openedThreads.value.push(thread);
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
		return true;
	}

	return {
		recentThreads,
		openedThreads,
		threadsById,
		knownThreads,
		deletedThreadIds,
		remember,
		fetchRecent,
		loadThread,
		deleteThread,
	};
});
