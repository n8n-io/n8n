import { useRouter } from 'vue-router';

import type { AppAssistantHandoff } from '@n8n/frontend-module-sdk';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';

import {
	INSTANCE_AI_APP_ID_QUERY,
	INSTANCE_AI_PENDING_APP_ID_QUERY,
	INSTANCE_AI_PROJECT_ID_QUERY,
	INSTANCE_AI_SOURCE_QUERY,
	INSTANCE_AI_THREAD_VIEW,
	INSTANCE_AI_VIEW,
} from '../constants';
import { useInstanceAiStore } from '../instanceAi.store';
import { provisionSubjectThread } from './useInstanceAiHandoff';
import { threadTargetsSubject, type InstanceAiEmbedSubject } from '../embed/instanceAiEmbed.types';

export function useAppAssistantHandoff(): AppAssistantHandoff {
	const router = useRouter();
	const store = useInstanceAiStore();
	const toast = useToast();
	const i18n = useI18n();

	async function openApp(input: {
		appId: string;
		projectId: string;
		appName?: string;
	}): Promise<boolean> {
		const subject: InstanceAiEmbedSubject = {
			type: 'app',
			id: input.appId,
			projectId: input.projectId,
			...(input.appName ? { name: input.appName } : {}),
		};

		try {
			const loaded = await store.loadThreads();
			if (!loaded) throw new Error(i18n.baseText('instanceAi.handoff.openFailed.message'));
			const existing = store.threads.find((thread) =>
				threadTargetsSubject(thread.metadata, subject),
			);
			const threadId =
				existing?.id ??
				(await provisionSubjectThread(subject, {
					source: 'app_builder_page',
					origin: 'internal',
					sourceContext: { appId: input.appId },
				}));
			await router.replace({
				name: INSTANCE_AI_THREAD_VIEW,
				params: { threadId },
				query: { [INSTANCE_AI_APP_ID_QUERY]: input.appId },
			});
			return true;
		} catch (error) {
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

	return { openApp, createApp };
}
