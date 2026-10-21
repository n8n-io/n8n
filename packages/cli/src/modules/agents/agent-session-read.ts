import type { AgentSessionDetail } from './agent-context.contracts';
import type { ThreadDetail } from './agent-execution.service';

export function toAgentSessionDetail({ thread, executions }: ThreadDetail): AgentSessionDetail {
	return {
		thread: {
			id: thread.id,
			agentId: thread.agentId,
			agentName: thread.agentName,
			title: thread.title,
			sessionNumber: thread.sessionNumber,
			createdAt: thread.createdAt,
			updatedAt: thread.updatedAt,
		},
		executions: executions.map(
			({
				id,
				status,
				inputMessageIds,
				inputMessages,
				userMessage,
				model,
				duration,
				totalTokens,
				error,
				timeline,
			}) => ({
				id,
				status,
				inputMessageIds,
				inputMessages,
				userMessage,
				model,
				duration,
				totalTokens,
				error,
				timeline,
			}),
		),
	};
}
