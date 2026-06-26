import type { AgentExecutionLogStorageLocation } from '@n8n/config';

import type { RecordedToolCall, TimelineEvent } from '../execution-recorder';

export type AgentExecutionLogRef = {
	agentId: string;
	threadId: string;
	executionId: string;
};

export type StoredAgentExecutionLogRef = AgentExecutionLogRef & {
	storedAt: AgentExecutionLogStorageLocation;
};

export type ExternalAgentExecutionLogRef = StoredAgentExecutionLogRef;

export type AgentExecutionLogPayload = {
	assistantResponse: string;
	toolCalls: RecordedToolCall[] | null;
	timeline: TimelineEvent[] | null;
	error: string | null;
};

export type AgentExecutionLogBundle = AgentExecutionLogPayload & {
	version: 1;
};

export interface AgentExecutionLogStore {
	init?(): Promise<void>;
	write(ref: AgentExecutionLogRef, payload: AgentExecutionLogPayload): Promise<number>;
	read(ref: AgentExecutionLogRef): Promise<AgentExecutionLogBundle | null>;
	readMany(refs: AgentExecutionLogRef[]): Promise<Map<string, AgentExecutionLogBundle>>;
}

export interface DeletableAgentExecutionLogStore extends AgentExecutionLogStore {
	delete(ref: AgentExecutionLogRef | AgentExecutionLogRef[]): Promise<void>;
}
