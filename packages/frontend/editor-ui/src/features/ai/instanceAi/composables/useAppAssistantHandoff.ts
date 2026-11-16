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

/** The navigation left the page that asked for the chat, so the result no longer matters. */
class OriginRouteLeftError extends Error {}

export function useAppAssistantHandoff(): AppAssistantHandoff {
	const router = useRouter();
	const rootStore = useRootStore();
	const store = useInstanceAiStore();
	const settingsStore = useInstanceAiSettingsStore();
	const assistantAgentThreadsStore = useAssistantAgentThreadsStore();
	const toast = useToast();
	const i18n = useI18n();
	const available = useInstanceAiReady();

	/** The newest Assistant agent thread of the app. */
	async function findAssistantAgentThread(
		subject: InstanceAiEmbedSubject,
		assertOriginRouteActive: () => void,
	): Promise<string | undefined> {
		// The store holds threads that are newer than the last page load, for example one started in this tab.
		const known = assistantAgentThreadsStore.knownThreads.find((thread) =>
			threadTargetsSubject(thread.metadata, subject),
		);
		if (known) return known.id;
		let cursor: string | undefined;
		while (true) {
			const page = await listSystemAgentThreads(rootStore.restApiContext, ASSISTANT_AGENT_ID, {
				limit: THREAD_PAGE_SIZE,
				cursor,
			});
			assertOriginRouteActive();
			const match = page.data.find((thread) => threadTargetsSubject(thread.metadata, subject));
			if (match) {
				assistantAgentThreadsStore.addOpenedThread(match);
				return match.id;
			}
			if (!page.nextCursor) return undefined;
			cursor = page.nextCursor;
		}
	}

	/** The newest thread of the app on the current Assistant runtime. */
	async function findAssistantThread(
		subject: InstanceAiEmbedSubject,
		assertOriginRouteActive: () => void,
	): Promise<string | undefined> {
		const loaded = await store.loadThreads();
		assertOriginRouteActive();
		if (!loaded) throw new Error(i18n.baseText('instanceAi.handoff.openFailed.message'));
		let existingThreadId: string | undefined = store.threads
			.filter((thread) => threadTargetsSubject(thread.metadata, subject))
			.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.id.localeCompare(a.id))[0]?.id;
		let cursor: string | undefined;
		while (!existingThreadId) {
			const page = await fetchThreadHistory(rootStore.restApiContext, {
				limit: THREAD_PAGE_SIZE,
				cursor,
			});
			assertOriginRouteActive();
			existingThreadId = page.threads.find((thread) =>
				threadTargetsSubject(thread.metadata, subject),
			)?.id;
			if (existingThreadId || !page.hasMore || !page.nextCursor) break;
			cursor = page.nextCursor;
		}
		return existingThreadId;
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
