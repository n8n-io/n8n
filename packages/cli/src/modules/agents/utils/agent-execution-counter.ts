import type { AgentExecutionCounter } from '@n8n/agents';

import type { AgentRunTelemetryType } from '@/interfaces';
import type { Telemetry } from '@/telemetry';

export function createAgentExecutionCounter(
	telemetry: Telemetry,
	{
		agentId,
		userId,
		runType,
	}: { agentId: string; userId?: string; runType: AgentRunTelemetryType },
): AgentExecutionCounter {
	const attribution = userId ? { user_id: userId } : {};
	return {
		incrementMessageCount: () =>
			telemetry.trackAgentExecution({
				agent_id: agentId,
				...attribution,
				run_type: runType,
				message_count: 1,
			}),
		incrementTokenCount: (tokenCount) =>
			telemetry.trackAgentExecution({
				agent_id: agentId,
				...attribution,
				run_type: runType,
				token_count: tokenCount,
			}),
		incrementToolCallCount: () =>
			telemetry.trackAgentExecution({
				agent_id: agentId,
				...attribution,
				run_type: runType,
				tool_call_count: 1,
			}),
	};
}
