import type {
	AgentExecutionStatus,
	AgentPersistedMessageDto,
	AgentSessionOrigin,
	AgentSessionStatus,
} from '@n8n/api-types';

import type { TimelineEvent } from './execution-recorder';

export type AgentContextLookup =
	| { type: 'agents' }
	| { type: 'config-schema' }
	| { type: 'capabilities' }
	| { type: 'integrations'; queries?: string[] }
	| { type: 'attachable-workflows'; searchTerm?: string }
	| { type: 'config' | 'skills' | 'tasks' | 'custom-tools'; agentId: string }
	| { type: 'skill'; agentId: string; skillId: string; referencePaths?: string[] }
	| { type: 'custom-tool'; agentId: string; toolId: string }
	| {
			type: 'sessions';
			agentId: string;
			limit?: number;
			cursor?: string;
			status?: AgentSessionStatus;
			origin?: AgentSessionOrigin;
			updatedAfter?: string;
			updatedBefore?: string;
	  }
	| { type: 'session'; agentId: string; threadId: string; executionId?: string };

export type AgentSessionListOptions = Omit<
	Extract<AgentContextLookup, { type: 'sessions' }>,
	'type' | 'agentId'
>;

export interface AgentContextReader {
	lookup(input: AgentContextLookup): Promise<AgentContextResult>;
}

export interface AgentContextResult extends Record<string, unknown> {
	sessionDetail?: AgentSessionDetail;
}

export interface AgentSessionSummary {
	threadId: string;
	agentId: string;
	agentName: string;
	title: string;
	sessionNumber: number;
	createdAt: string;
	updatedAt: string;
	status: AgentSessionStatus | null;
	origin: string | null;
	failureCount: number;
	totalPromptTokens: number;
	totalCompletionTokens: number;
	totalDuration: number;
}

export type AgentSessionList = {
	sessions: AgentSessionSummary[];
	nextCursor: string | null;
};

export interface AgentSessionThread {
	id: string;
	agentId: string;
	agentName: string;
	title: string | null;
	sessionNumber: number;
	createdAt: Date;
	updatedAt: Date;
}

export interface AgentSessionTurn {
	id: string;
	status: AgentExecutionStatus;
	inputMessageIds?: string[];
	inputMessages?: AgentPersistedMessageDto[];
	userMessage: string | null;
	model: string | null;
	duration: number;
	totalTokens: number | null;
	error: string | null;
	timeline: TimelineEvent[] | null;
}

export interface AgentSessionDetail {
	thread: AgentSessionThread;
	executions: AgentSessionTurn[];
}
