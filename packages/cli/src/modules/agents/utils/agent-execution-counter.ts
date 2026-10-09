import type { AgentExecutionCounter } from '@n8n/agents';

import type { AgentRunTelemetryType } from '@/interfaces';
import type { Telemetry } from '@/telemetry';

export function createAgentExecutionCounter(
	telemetry: Telemetry,
	{
		agentId,
		userId,
		runType,
		source,
	}: { agentId: string; userId?: string; runType: AgentRunTelemetryType; source?: string },
): AgentExecutionCounter {
	const attribution = userId ? { user_id: userId } : {};
	return {
		incrementMessageCount: () =>
			telemetry.trackAgentExecution({
				agent_id: agentId,
				...attribution,
				run_type: runType,
				source,
				message_count: 1,
			}),
		incrementTokenCount: (tokenCount) =>
			telemetry.trackAgentExecution({
				agent_id: agentId,
				...attribution,
				run_type: runType,
				source,
				token_count: tokenCount,
			}),
		incrementToolCallCount: () =>
			telemetry.trackAgentExecution({
				agent_id: agentId,
				...attribution,
				run_type: runType,
				source,
				tool_call_count: 1,
			}),
	};
}
