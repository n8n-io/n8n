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

/** A project agent that an owner can select. */
export interface AgentProjectListItem {
	id: string;
	name: string;
	published: boolean;
}

/** The published version of an agent. */
export interface AgentPublishedVersion {
	/** `agents.activeVersionId`. */
	versionId: string;
	/** When this version became the published version. */
	publishedAt: Date;
	agentName: string;
	/** Whether the draft equals the published version, followed skills included. */
	clean: boolean;
}

/** Half-open interval `(after, until]` on the creation time of a turn. */
export interface AgentProductionTraceWindow {
	/** Null means no lower bound. */
	after: Date | null;
	until: Date;
}

/**
 * One production session: a session that the reader can access, with one
 * settled top-level turn or more from a production source in the window.
 * The summary uses only the turns in the window.
 */
export interface AgentProductionTraceSummary {
	/** The thread id. */
	sessionId: string;
	/** Origin of the session. */
	source: string | null;
	/** ISO 8601 time of the newest turn in the window. */
	lastActivityAt: string;
	/** Turns in the window. */
	turnCount: number;
	/** The user text of the first turn in the window, truncated. */
	firstUserMessage: string | null;
	/** Names of the tools that the turns in the window called, in call order. */
	toolNames: string[];
	/** The first failure text of a turn in the window. */
	failure: string | null;
	/** Sum over the turns in the window. */
	cost: number | null;
	/** Sum over the turns in the window. */
	totalTokens: number | null;
	/** Sum over the turns in the window. */
	durationMs: number | null;
}

/**
 * A production session with its full conversation. `session.executions` holds
 * every turn of the thread in order, also the turns from before the window.
 */
export type AgentProductionTrace = AgentProductionTraceSummary & { session: AgentSessionDetail };
