import type { AgentMessage, ContentToolResult } from '../sdk/message';

export const enum AgentEvent {
	AgentStart = 'agent_start',
	AgentEnd = 'agent_end',
	TurnStart = 'turn_start',
	TurnEnd = 'turn_end',
	ToolExecutionStart = 'tool_execution_start',
	ToolExecutionEnd = 'tool_execution_end',
	Error = 'error',
}

export type AgentEventData =
	| { type: AgentEvent.AgentStart }
	| { type: AgentEvent.AgentEnd; messages: AgentMessage[] }
	| { type: AgentEvent.TurnStart }
	| { type: AgentEvent.TurnEnd; message: AgentMessage; toolResults: ContentToolResult[] }
	| { type: AgentEvent.ToolExecutionStart; toolCallId: string; toolName: string; args: unknown }
	| {
			type: AgentEvent.ToolExecutionEnd;
			toolCallId: string;
			toolName: string;
			result: unknown;
			isError: boolean;
	  }
	| { type: AgentEvent.Error; message: string; error: unknown };

export type AgentEventHandler = (data: AgentEventData) => void;

// Can be used for observability or controlling the agent. The idea that HITL, guardrails, logging, etc. can be done as middleware and single point of entry.
export interface AgentMiddleware {
	on: (event: AgentEvent, handler: AgentEventHandler) => void;
}
