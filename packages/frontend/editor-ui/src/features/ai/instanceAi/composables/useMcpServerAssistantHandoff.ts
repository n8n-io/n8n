import { useRouter } from 'vue-router';

import type { McpServerAssistantHandoff } from '@n8n/frontend-module-sdk';

import { INSTANCE_AI_THREAD_VIEW } from '@/features/ai/instanceAi/constants';

import type { InstanceAiThreadLaunch } from './useInstanceAiHandoff';
import { useSubjectAssistantHandoff } from './useSubjectAssistantHandoff';

/** Where a thread on a custom MCP server starts: its page, by the panel or the hand-off. */
export function mcpServerThreadLaunch(serverId: string): InstanceAiThreadLaunch {
	return { source: 'mcp_server_page', origin: 'internal', sourceContext: { serverId } };
}

/** The full Assistant for a custom MCP server, when its page has no Assistant panel. */
export function useMcpServerAssistantHandoff(): McpServerAssistantHandoff {
	const router = useRouter();
	const { available, openSubject } = useSubjectAssistantHandoff();

	async function openServer(input: {
		serverId: string;
		projectId: string;
		serverName?: string;
	}): Promise<boolean> {
		return await openSubject(
			{
				type: 'mcpServer',
				id: input.serverId,
				projectId: input.projectId,
				...(input.serverName ? { name: input.serverName } : {}),
			},
			mcpServerThreadLaunch(input.serverId),
			async (threadId) =>
				await router.push({ name: INSTANCE_AI_THREAD_VIEW, params: { threadId } }),
		);
	}

	return { available, openServer };
}
