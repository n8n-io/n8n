import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';

export interface ExecutionThread {
	id: string;
	agentId: string;
	agentName: string;
	projectId: string;
	sessionNumber: number;
	totalPromptTokens: number;
	totalCompletionTokens: number;
	totalCost: number;
	createdAt: string;
	updatedAt: string;
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
): Promise<ThreadsPage> => {
	const params = new URLSearchParams({ limit: String(limit) });
	if (cursor) params.set('cursor', cursor);
	return await makeRestApiRequest<ThreadsPage>(
		context,
		'GET',
		`/projects/${projectId}/agents/v2/threads?${params.toString()}`,
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
