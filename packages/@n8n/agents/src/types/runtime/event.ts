import type { FinishReason, TokenUsage } from '../sdk/agent';
import type { AgentMessage, ContentToolCall } from '../sdk/message';

export type SubAgentLifecycleUsage = Pick<
	TokenUsage,
	'promptTokens' | 'completionTokens' | 'totalTokens' | 'cost'
>;

export interface SubAgentLifecycleBase {
	taskName: string;
	taskPath: string;
	parentRunId?: string;
	parentToolCallId?: string;
	subAgentId?: string;
}

export interface SubAgentStartedPayload extends SubAgentLifecycleBase {
	startedAt: number;
}

export interface SubAgentCompletedPayload extends SubAgentLifecycleBase {
	status: 'completed' | 'failed' | 'suspended';
	startedAt: number;
	finishedAt: number;
	durationMs: number;
	runId?: string;
	/** The child run's memory thread id (`persistence.threadId`), so consumers can correlate or continue it. */
	threadId?: string;
	/** Effective child model id used for this delegation. */
	model?: string;
	usage?: SubAgentLifecycleUsage;
	finishReason?: FinishReason;
	error?: string;
}

export const enum AgentEvent {
	AgentStart = 'agent_start',
	AgentEnd = 'agent_end',
	TurnStart = 'turn_start',
	TurnEnd = 'turn_end',
	ToolExecutionStart = 'tool_execution_start',
	ToolExecutionEnd = 'tool_execution_end',
	SubAgentStarted = 'subagent_started',
	SubAgentCompleted = 'subagent_completed',
	Error = 'error',
}

export type AgentEventData =
	| { type: AgentEvent.AgentStart }
	| { type: AgentEvent.AgentEnd; messages: AgentMessage[] }
	| { type: AgentEvent.TurnStart }
	| { type: AgentEvent.TurnEnd; message: AgentMessage; toolResults: ContentToolCall[] }
	| { type: AgentEvent.ToolExecutionStart; toolCallId: string; toolName: string; args: unknown }
	| {
			type: AgentEvent.ToolExecutionEnd;
			toolCallId: string;
			toolName: string;
			result: unknown;
			isError: boolean;
	  }
	| ({ type: AgentEvent.SubAgentStarted } & SubAgentStartedPayload)
	| ({ type: AgentEvent.SubAgentCompleted } & SubAgentCompletedPayload)
	| {
			type: AgentEvent.Error;
			message: string;
			error: unknown;
			source?: 'observer' | 'reflector' | 'episodic-memory';
	  };

export type AgentEventHandler = (data: AgentEventData) => void;

// Can be used for observability or controlling the agent. The idea that HITL, guardrails, logging, etc. can be done as middleware and single point of entry.
export interface AgentMiddleware {
	on: (event: AgentEvent, handler: AgentEventHandler) => void;
}
