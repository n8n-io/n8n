import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';

export interface ExecutionThread {
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

export interface ThreadExecution {
	id: string;
	status: string;
	startedAt: string | null;
	stoppedAt: string | null;
	createdAt: string;
	metadata: Array<{ key: string; value: string }>;
}

export interface ThreadDetail {
	thread: ExecutionThread;
	executions: ThreadExecution[];
}

export interface ThreadsPage {
	threads: ExecutionThread[];
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
