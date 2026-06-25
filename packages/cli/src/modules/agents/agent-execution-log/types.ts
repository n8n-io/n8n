import type { EntityManager, ExecutionDataStorageLocation } from '@n8n/db';

import type { RecordedToolCall, TimelineEvent } from '../execution-recorder';

export type AgentExecutionLogRef = {
	agentId: string;
	threadId: string;
	executionId: string;
};

export type StoredAgentExecutionLogRef = AgentExecutionLogRef & {
	storedAt: ExecutionDataStorageLocation;
};

export type ExternalAgentExecutionLogRef = AgentExecutionLogRef & {
	storedAt: Exclude<ExecutionDataStorageLocation, 'db'>;
};

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
	/** `tx` is used only by the DB-backed store; blob stores write outside the database transaction. */
	write(
		ref: AgentExecutionLogRef,
		payload: AgentExecutionLogPayload,
		tx?: EntityManager,
	): Promise<number>;
	read(ref: AgentExecutionLogRef, tx?: EntityManager): Promise<AgentExecutionLogBundle | null>;
	readMany(refs: AgentExecutionLogRef[]): Promise<Map<string, AgentExecutionLogBundle>>;
}

export interface DeletableAgentExecutionLogStore extends AgentExecutionLogStore {
	delete(ref: AgentExecutionLogRef | AgentExecutionLogRef[]): Promise<void>;
}
