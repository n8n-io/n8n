import type { InstanceAiPrefillPayload } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import type { McpServerAssistantHandoff } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import { useRouter } from 'vue-router';

import { INSTANCE_AI_THREAD_VIEW } from '@/features/ai/instanceAi/constants';

import { useInstanceAiReady } from './useInstanceAiAvailability';
import {
	clearPendingThreadHandoff,
	provisionLaunchedSubjectThread,
	stashPendingComposerDraft,
	type InstanceAiThreadLaunch,
} from './useInstanceAiHandoff';

/** Where a thread on a custom MCP server starts: its page. */
export function mcpServerThreadLaunch(serverId: string): InstanceAiThreadLaunch {
	return { source: 'mcp_server_page', origin: 'internal', sourceContext: { serverId } };
}

/** Opens the Assistant view on a new thread with the custom MCP server as a tab. */
export function useMcpServerAssistantHandoff(): McpServerAssistantHandoff {
	const router = useRouter();
	const toast = useToast();
	const i18n = useI18n();
	const available = useInstanceAiReady();

	async function openServer(input: {
		serverId: string;
		projectId: string;
		serverName?: string;
		prefill?: InstanceAiPrefillPayload;
	}): Promise<boolean> {
		if (!available.value) return false;
		const originRoute = router.currentRoute.value;
		let threadId: string | undefined;
		try {
			threadId = await provisionLaunchedSubjectThread(
				{
					type: 'mcpServer',
					id: input.serverId,
					projectId: input.projectId,
					...(input.serverName ? { name: input.serverName } : {}),
				},
				mcpServerThreadLaunch(input.serverId),
			);
			if (router.currentRoute.value !== originRoute) {
				clearPendingThreadHandoff(threadId);
				return true;
			}
			if (input.prefill) {
				stashPendingComposerDraft(threadId, input.prefill);
			}
			await router.push({ name: INSTANCE_AI_THREAD_VIEW, params: { threadId } });
			return true;
		} catch (error) {
			if (threadId) clearPendingThreadHandoff(threadId);
			if (router.currentRoute.value !== originRoute) return true;
			toast.showError(error, i18n.baseText('instanceAi.handoff.openFailed.title'));
			return false;
		}
	}

	return { available, openServer };
}
