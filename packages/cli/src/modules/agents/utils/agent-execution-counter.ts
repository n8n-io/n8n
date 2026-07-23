import type { AgentExecutionCounter } from '@n8n/agents';

import type { Telemetry } from '@/telemetry';

export function createAgentExecutionCounter(
	telemetry: Telemetry,
	{ agentId, userId }: { agentId: string; userId?: string },
): AgentExecutionCounter {
	const attribution = userId ? { user_id: userId } : {};
	return {
		incrementMessageCount: () =>
			telemetry.trackAgentExecution({
				agent_id: agentId,
				...attribution,
				message_count: 1,
			}),
		incrementTokenCount: (tokenCount) =>
			telemetry.trackAgentExecution({
				agent_id: agentId,
				...attribution,
				token_count: tokenCount,
			}),
		incrementToolCallCount: () =>
			telemetry.trackAgentExecution({
				agent_id: agentId,
				...attribution,
				tool_call_count: 1,
			}),
	};
}
