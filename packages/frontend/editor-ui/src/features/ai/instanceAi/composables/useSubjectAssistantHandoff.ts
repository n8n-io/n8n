import { useRouter } from 'vue-router';

import type { InstanceAiThreadSubject } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';

import { listSystemAgentThreads } from '@/features/agents/composables/useAgentApi';
import { ASSISTANT_AGENT_ID } from '@/features/ai/instanceAi/assistantAgent/assistantAgentThreads';
import { useAssistantAgentThreadsStore } from '@/features/ai/instanceAi/assistantAgent/assistantAgentThreads.store';
import { threadTargetsSubject } from '@/features/ai/instanceAi/embed/instanceAiEmbed.types';
import { fetchThreadHistory } from '@/features/ai/instanceAi/instanceAi.memory.api';
import { useInstanceAiStore } from '@/features/ai/instanceAi/instanceAi.store';
import { useInstanceAiSettingsStore } from '@/features/ai/instanceAi/instanceAiSettings.store';

import { useInstanceAiReady } from './useInstanceAiAvailability';
import {
	provisionLaunchedSubjectThread,
	type InstanceAiThreadLaunch,
} from './useInstanceAiHandoff';

const THREAD_PAGE_SIZE = 100;

/**
 * The navigation left the page that asked for the chat, so the result no longer
 * matters. It stops a lookup from inside its paging.
 */
class OriginRouteLeftError extends Error {}

/** The first item that matches, from pages that the server returns newest first. */
async function findInPages<T>(
	fetchPage: (cursor: string | undefined) => Promise<{ items: T[]; nextCursor: string | null }>,
	matches: (item: T) => boolean,
	assertOriginRouteActive: () => void,
): Promise<T | undefined> {
	let cursor: string | undefined;
	do {
		const page = await fetchPage(cursor);
		assertOriginRouteActive();
		const match = page.items.find(matches);
		if (match) return match;
		cursor = page.nextCursor ?? undefined;
	} while (cursor);
	return undefined;
}

/**
 * Opens the full Assistant on the resource of a page: its newest thread, or a new
 * thread bound to it. The page names the resource and how to show the thread.
 */
export function useSubjectAssistantHandoff() {
	const router = useRouter();
	const rootStore = useRootStore();
	const store = useInstanceAiStore();
	const settingsStore = useInstanceAiSettingsStore();
	const assistantAgentThreadsStore = useAssistantAgentThreadsStore();
	const toast = useToast();
	const i18n = useI18n();
	const available = useInstanceAiReady();

	/**
	 * The newest Assistant agent thread of the subject. Only the server knows a thread
	 * that another tab created, so the lookup does not read the threads of this tab.
	 */
	async function findAssistantAgentThread(
		subject: InstanceAiThreadSubject,
		assertOriginRouteActive: () => void,
	): Promise<string | undefined> {
		const match = await findInPages(
			async (cursor) => {
				const page = await listSystemAgentThreads(rootStore.restApiContext, ASSISTANT_AGENT_ID, {
					limit: THREAD_PAGE_SIZE,
					cursor,
				});
				return { items: page.data, nextCursor: page.nextCursor };
			},
			(thread) => threadTargetsSubject(thread.metadata, subject),
			assertOriginRouteActive,
		);
		if (match) assistantAgentThreadsStore.addOpenedThread(match);
		return match?.id;
	}

	/** The newest thread of the subject on the current Assistant runtime. */
	async function findAssistantThread(
		subject: InstanceAiThreadSubject,
		assertOriginRouteActive: () => void,
	): Promise<string | undefined> {
		const loaded = await store.loadThreads();
		assertOriginRouteActive();
		if (!loaded) throw new Error(i18n.baseText('instanceAi.handoff.openFailed.message'));
		const loadedThreadId = store.threads
			.filter((thread) => threadTargetsSubject(thread.metadata, subject))
			.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.id.localeCompare(a.id))[0]?.id;
		if (loadedThreadId) return loadedThreadId;
		const match = await findInPages(
			async (cursor) => {
				const page = await fetchThreadHistory(rootStore.restApiContext, {
					limit: THREAD_PAGE_SIZE,
					cursor,
				});
				return { items: page.threads, nextCursor: page.hasMore ? page.nextCursor : null };
			},
			(thread) => threadTargetsSubject(thread.metadata, subject),
			assertOriginRouteActive,
		);
		return match?.id;
	}

	/**
	 * Returns `false` when the Assistant is not available or the thread does not open.
	 * A navigation away from the page while the lookup runs drops the result.
	 */
	async function openSubject(
		subject: InstanceAiThreadSubject,
		launch: InstanceAiThreadLaunch,
		showThread: (threadId: string) => Promise<unknown>,
	): Promise<boolean> {
		if (!available.value) return false;

		const originRoute = router.currentRoute.value;
		const assertOriginRouteActive = () => {
			if (router.currentRoute.value !== originRoute) throw new OriginRouteLeftError();
		};
		const useAssistantAgent = settingsStore.newThreadsUseAssistantAgent;

		try {
			// A user in the rollout keeps the chats from before it.
			const existingThreadId =
				(useAssistantAgent
					? await findAssistantAgentThread(subject, assertOriginRouteActive)
					: undefined) ?? (await findAssistantThread(subject, assertOriginRouteActive));
			const threadId = existingThreadId ?? (await provisionLaunchedSubjectThread(subject, launch));
			assertOriginRouteActive();
			await showThread(threadId);
			return true;
		} catch (error) {
			if (error instanceof OriginRouteLeftError || router.currentRoute.value !== originRoute) {
				return true;
			}
			toast.showError(error, i18n.baseText('instanceAi.handoff.openFailed.title'));
			return false;
		}
	}

	return { available, openSubject };
}
