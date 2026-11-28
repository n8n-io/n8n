import { useRouter } from 'vue-router';

import type { AppAssistantHandoff } from '@n8n/frontend-module-sdk';

import {
	INSTANCE_AI_APP_ID_QUERY,
	INSTANCE_AI_PENDING_APP_ID_QUERY,
	INSTANCE_AI_PROJECT_ID_QUERY,
	INSTANCE_AI_SOURCE_QUERY,
	INSTANCE_AI_THREAD_VIEW,
	INSTANCE_AI_VIEW,
} from '@/features/ai/instanceAi/constants';

import { useSubjectAssistantHandoff } from './useSubjectAssistantHandoff';

export function useAppAssistantHandoff(): AppAssistantHandoff {
	const router = useRouter();
	const { available, openSubject } = useSubjectAssistantHandoff();

	async function openApp(input: {
		appId: string;
		projectId: string;
		appName?: string;
	}): Promise<boolean> {
		return await openSubject(
			{
				type: 'app',
				id: input.appId,
				projectId: input.projectId,
				...(input.appName ? { name: input.appName } : {}),
			},
			{ source: 'app_builder_page', origin: 'internal', sourceContext: { appId: input.appId } },
			async (threadId) =>
				await router.replace({
					name: INSTANCE_AI_THREAD_VIEW,
					params: { threadId },
					query: { [INSTANCE_AI_APP_ID_QUERY]: input.appId },
				}),
		);
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
