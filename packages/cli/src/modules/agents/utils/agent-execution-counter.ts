import type { AgentExecutionCounter } from '@n8n/agents';

import type { AgentRunTelemetryType } from '../agent-telemetry.types';
import type { AgentUsageTelemetryService } from '../agent-usage-telemetry.service';

export function createAgentExecutionCounter(
	usageTelemetry: AgentUsageTelemetryService,
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
			usageTelemetry.trackAgentExecution({
				agent_id: agentId,
				...attribution,
				run_type: runType,
				source,
				message_count: 1,
			}),
		incrementTokenCount: (tokenCount) =>
			usageTelemetry.trackAgentExecution({
				agent_id: agentId,
				...attribution,
				run_type: runType,
				source,
				token_count: tokenCount,
			}),
		incrementToolCallCount: () =>
			usageTelemetry.trackAgentExecution({
				agent_id: agentId,
				...attribution,
				run_type: runType,
				source,
				tool_call_count: 1,
			}),
	};
}
