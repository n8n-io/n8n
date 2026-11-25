import { useRouter } from 'vue-router';

import type { InstanceAiThreadSubject } from '@n8n/api-types';
import type { AppAssistantHandoff } from '@n8n/frontend-module-sdk';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';

import { listSystemAgentThreads } from '@/features/agents/composables/useAgentApi';

import {
	INSTANCE_AI_APP_ID_QUERY,
	INSTANCE_AI_PENDING_APP_ID_QUERY,
	INSTANCE_AI_PROJECT_ID_QUERY,
	INSTANCE_AI_SOURCE_QUERY,
	INSTANCE_AI_THREAD_VIEW,
	INSTANCE_AI_VIEW,
} from '../constants';
import { useInstanceAiStore } from '../instanceAi.store';
import { fetchThreadHistory } from '../instanceAi.memory.api';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';
import { ASSISTANT_AGENT_ID } from '../assistantAgent/assistantAgentThreads';
import { useAssistantAgentThreadsStore } from '../assistantAgent/assistantAgentThreads.store';
import { useInstanceAiReady } from './useInstanceAiAvailability';
import { provisionLaunchedSubjectThread } from './useInstanceAiHandoff';
import { threadTargetsSubject, type InstanceAiEmbedSubject } from '../embed/instanceAiEmbed.types';

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

export function useAppAssistantHandoff(): AppAssistantHandoff {
	const router = useRouter();
	const rootStore = useRootStore();
	const store = useInstanceAiStore();
	const settingsStore = useInstanceAiSettingsStore();
	const assistantAgentThreadsStore = useAssistantAgentThreadsStore();
	const toast = useToast();
	const i18n = useI18n();
	const available = useInstanceAiReady();

	/**
	 * The newest Assistant agent thread of the app. Only the server knows a thread
	 * that another tab created, so the lookup does not read the threads of this tab.
	 */
	async function findAssistantAgentThread(
		subject: InstanceAiEmbedSubject,
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

	/** The newest thread of the app on the current Assistant runtime. */
	async function findAssistantThread(
		subject: InstanceAiEmbedSubject,
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

	async function openApp(input: {
		appId: string;
		projectId: string;
		appName?: string;
	}): Promise<boolean> {
		if (!available.value) return false;

		const subject: InstanceAiThreadSubject = {
			type: 'app',
			id: input.appId,
			projectId: input.projectId,
			...(input.appName ? { name: input.appName } : {}),
		};
		const originRoute = router.currentRoute.value;
		const assertOriginRouteActive = () => {
			if (router.currentRoute.value !== originRoute) throw new OriginRouteLeftError();
		};
		const useAssistantAgent = settingsStore.newThreadsUseAssistantAgent;

		try {
			// A user in the rollout keeps the app chats from before it.
			const existingThreadId =
				(useAssistantAgent
					? await findAssistantAgentThread(subject, assertOriginRouteActive)
					: undefined) ?? (await findAssistantThread(subject, assertOriginRouteActive));
			const threadId =
				existingThreadId ??
				(await provisionLaunchedSubjectThread(subject, {
					source: 'app_builder_page',
					origin: 'internal',
					sourceContext: { appId: input.appId },
				}));
			assertOriginRouteActive();
			await router.replace({
				name: INSTANCE_AI_THREAD_VIEW,
				params: { threadId },
				query: { [INSTANCE_AI_APP_ID_QUERY]: input.appId },
			});
			return true;
		} catch (error) {
			if (error instanceof OriginRouteLeftError || router.currentRoute.value !== originRoute) {
				return true;
			}
			toast.showError(error, i18n.baseText('instanceAi.handoff.openFailed.title'));
			return false;
		}
	}

	async function createApp(input: { appId: string; projectId: string }): Promise<void> {
		await router.push({
			name: INSTANCE_AI_VIEW,
			query: {
				[INSTANCE_AI_PENDING_APP_ID_QUERY]: input.appId,
				[INSTANCE_AI_PROJECT_ID_QUERY]: input.projectId,
				[INSTANCE_AI_SOURCE_QUERY]: 'app_builder_page',
			},
		});
	}

	return { available, openApp, createApp };
}
