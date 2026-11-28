import type { InstanceAiPrefillPayload } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import type { McpServerAssistantHandoff } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import { isNavigationFailure, NavigationFailureType, useRouter } from 'vue-router';

import { INSTANCE_AI_THREAD_VIEW } from '@/features/ai/instanceAi/constants';
import { useInstanceAiStore } from '@/features/ai/instanceAi/instanceAi.store';

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

// Guard against rapid repeat clicks while a thread is being provisioned.
let handoffInFlight = false;

/** Opens the Assistant view on a new thread with the custom MCP server as a tab. */
export function useMcpServerAssistantHandoff(): McpServerAssistantHandoff {
	const router = useRouter();
	const instanceAiStore = useInstanceAiStore();
	const toast = useToast();
	const i18n = useI18n();
	const available = useInstanceAiReady();

	async function discardThread(threadId: string) {
		clearPendingThreadHandoff(threadId);
		await instanceAiStore.deleteThread(threadId, { silent: true });
	}

	async function openServer(input: {
		serverId: string;
		projectId: string;
		serverName?: string;
		prefill?: InstanceAiPrefillPayload;
	}): Promise<boolean> {
		if (!available.value || handoffInFlight) return false;
		handoffInFlight = true;
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
				await discardThread(threadId);
				return true;
			}
			if (input.prefill) {
				stashPendingComposerDraft(threadId, input.prefill);
			}
			const failure = await router.push({ name: INSTANCE_AI_THREAD_VIEW, params: { threadId } });
			if (failure) {
				await discardThread(threadId);
				if (
					isNavigationFailure(failure, NavigationFailureType.cancelled) ||
					isNavigationFailure(failure, NavigationFailureType.aborted)
				) {
					return true;
				}
				toast.showError(failure, i18n.baseText('instanceAi.handoff.openFailed.title'));
				return false;
			}
			return true;
		} catch (error) {
			if (threadId) await discardThread(threadId);
			if (router.currentRoute.value !== originRoute) return true;
			toast.showError(error, i18n.baseText('instanceAi.handoff.openFailed.title'));
			return false;
		} finally {
			handoffInFlight = false;
		}
	}

	return { available, openServer };
}
