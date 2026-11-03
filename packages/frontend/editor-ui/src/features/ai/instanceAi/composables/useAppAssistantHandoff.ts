import { useRouter } from 'vue-router';

import type { AppAssistantHandoff } from '@n8n/frontend-module-sdk';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';

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
import { useInstanceAiReady } from './useInstanceAiAvailability';
import { provisionSubjectThread } from './useInstanceAiHandoff';
import { threadTargetsSubject, type InstanceAiEmbedSubject } from '../embed/instanceAiEmbed.types';

export function useAppAssistantHandoff(): AppAssistantHandoff {
	const router = useRouter();
	const rootStore = useRootStore();
	const store = useInstanceAiStore();
	const toast = useToast();
	const i18n = useI18n();
	const available = useInstanceAiReady();

	async function openApp(input: {
		appId: string;
		projectId: string;
		appName?: string;
	}): Promise<boolean> {
		if (!available.value) return false;

		const subject: InstanceAiEmbedSubject = {
			type: 'app',
			id: input.appId,
			projectId: input.projectId,
			...(input.appName ? { name: input.appName } : {}),
		};
		const originRoute = router.currentRoute.value;
		const isOriginRouteActive = () => router.currentRoute.value === originRoute;

		try {
			const loaded = await store.loadThreads();
			if (!isOriginRouteActive()) return true;
			if (!loaded) throw new Error(i18n.baseText('instanceAi.handoff.openFailed.message'));
			let existing = store.threads
				.filter((thread) => threadTargetsSubject(thread.metadata, subject))
				.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.id.localeCompare(a.id))[0];
			let cursor: string | undefined;
			while (!existing) {
				const page = await fetchThreadHistory(rootStore.restApiContext, { limit: 100, cursor });
				if (!isOriginRouteActive()) return true;
				existing = page.threads.find((thread) => threadTargetsSubject(thread.metadata, subject));
				if (existing || !page.hasMore || !page.nextCursor) break;
				cursor = page.nextCursor;
			}
			const threadId =
				existing?.id ??
				(await provisionSubjectThread(subject, {
					source: 'app_builder_page',
					origin: 'internal',
					sourceContext: { appId: input.appId },
				}));
			if (!isOriginRouteActive()) return true;
			await router.replace({
				name: INSTANCE_AI_THREAD_VIEW,
				params: { threadId },
				query: { [INSTANCE_AI_APP_ID_QUERY]: input.appId },
			});
			return true;
		} catch (error) {
			if (!isOriginRouteActive()) return true;
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
