import type { RecordedToolCall, TimelineEvent } from '../execution-recorder';

export type AgentExecutionLogStorageLocation = 'fs';

export type AgentExecutionLogRef = {
	agentId: string;
	threadId: string;
	executionId: string;
};

export type AgentExecutionLogPayload = {
	userMessage: string;
	assistantResponse: string;
	toolCalls: RecordedToolCall[] | null;
	timeline: TimelineEvent[] | null;
	error: string | null;
};

export type AgentExecutionLogBundle = AgentExecutionLogPayload & {
	version: 1;
};

export interface AgentExecutionLogStore {
	write(ref: AgentExecutionLogRef, payload: AgentExecutionLogPayload): Promise<number>;
	read(ref: AgentExecutionLogRef): Promise<AgentExecutionLogBundle | null>;
	readMany(refs: AgentExecutionLogRef[]): Promise<Map<string, AgentExecutionLogBundle>>;
	delete(ref: AgentExecutionLogRef | AgentExecutionLogRef[]): Promise<void>;
}
