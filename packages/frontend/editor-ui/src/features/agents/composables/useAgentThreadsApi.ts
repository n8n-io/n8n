import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';

export interface AgentExecutionThread {
	id: string;
	agentId: string;
	agentName: string;
	projectId: string;
	sessionNumber: number;
	title: string | null;
	emoji: string | null;
	totalPromptTokens: number;
	totalCompletionTokens: number;
	totalCost: number;
	totalDuration: number;
	createdAt: string;
	updatedAt: string;
	firstMessage?: string | null;
}

export type AgentExecutionStatus = 'success' | 'error';
export type AgentExecutionHitlStatus = 'suspended' | 'resumed';

/**
 * Raw timeline event shape as persisted on the agent_execution row.
 * The display-side parser in `session-timeline.utils.ts` is the source of
 * truth for the discriminated union; this is intentionally loose so the
 * API surface doesn't need to track every event field.
 */
export type AgentExecutionTimelineEvent = Record<string, unknown> & { type: string };

export interface AgentExecutionToolCall {
	toolName: string;
	input: unknown;
	output: unknown;
	[key: string]: unknown;
}

export interface AgentExecution {
	id: string;
	threadId: string;
	agentId: string;
	status: AgentExecutionStatus;
	createdAt: string;
	startedAt: string | null;
	stoppedAt: string | null;
	duration: number;
	userMessage: string;
	assistantResponse: string;
	model: string | null;
	promptTokens: number | null;
	completionTokens: number | null;
	totalTokens: number | null;
	cost: number | null;
	toolCalls: AgentExecutionToolCall[] | null;
	timeline: AgentExecutionTimelineEvent[] | null;
	error: string | null;
	hitlStatus: AgentExecutionHitlStatus | null;
	workingMemory: string | null;
	source: string | null;
}

export interface ThreadDetail {
	thread: AgentExecutionThread;
	executions: AgentExecution[];
}

export interface ThreadsPage {
	threads: AgentExecutionThread[];
	nextCursor: string | null;
}

export const listThreads = async (
	context: IRestApiContext,
	projectId: string,
	limit: number,
	cursor?: string,
	agentId?: string,
): Promise<ThreadsPage> => {
	const params = new URLSearchParams({ limit: String(limit) });
	if (cursor) params.set('cursor', cursor);
	if (agentId) params.set('agentId', agentId);
	return await makeRestApiRequest<ThreadsPage>(
		context,
		'GET',
		`/projects/${projectId}/agents/v2/threads?${params.toString()}`,
	);
};

export const getThreadDetail = async (
	context: IRestApiContext,
	projectId: string,
	threadId: string,
	agentId?: string,
): Promise<ThreadDetail> => {
	const params = agentId ? `?agentId=${agentId}` : '';
	return await makeRestApiRequest<ThreadDetail>(
		context,
		'GET',
		`/projects/${projectId}/agents/v2/threads/${threadId}${params}`,
	);
};

export const deleteThread = async (
	context: IRestApiContext,
	projectId: string,
	threadId: string,
): Promise<{ success: boolean }> => {
	return await makeRestApiRequest<{ success: boolean }>(
		context,
		'DELETE',
		`/projects/${projectId}/agents/v2/threads/${threadId}`,
	);
};
