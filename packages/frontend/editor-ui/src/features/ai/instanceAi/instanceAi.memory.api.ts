import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';
import type {
	InstanceAiThreadInfo,
	InstanceAiThreadListResponse,
	InstanceAiThreadHistoryQuery,
	InstanceAiThreadHistoryResponse,
	InstanceAiThreadTabsResponse,
	InstanceAiThreadTabsState,
} from '@n8n/api-types';
import type { AgentResource } from '@/features/agents/types';

export async function fetchThreads(
	context: IRestApiContext,
): Promise<InstanceAiThreadListResponse> {
	return await makeRestApiRequest(context, 'GET', '/instance-ai/threads');
}

export async function fetchThreadHistory(
	context: IRestApiContext,
	query: InstanceAiThreadHistoryQuery,
): Promise<InstanceAiThreadHistoryResponse> {
	return await makeRestApiRequest(context, 'GET', '/instance-ai/threads/history', query);
}

export async function fetchThread(
	context: IRestApiContext,
	threadId: string,
): Promise<{ thread: InstanceAiThreadInfo }> {
	return await makeRestApiRequest(context, 'GET', `/instance-ai/threads/${threadId}`);
}

export async function deleteThread(context: IRestApiContext, threadId: string): Promise<void> {
	await makeRestApiRequest(context, 'DELETE', `/instance-ai/threads/${threadId}`);
}

export async function renameThread(
	context: IRestApiContext,
	threadId: string,
	title: string,
): Promise<{ thread: InstanceAiThreadInfo }> {
	return await makeRestApiRequest(context, 'PATCH', `/instance-ai/threads/${threadId}`, {
		title,
	});
}

export async function updateThreadMetadata(
	context: IRestApiContext,
	threadId: string,
	metadata: Record<string, unknown>,
): Promise<{ thread: InstanceAiThreadInfo }> {
	return await makeRestApiRequest(context, 'PATCH', `/instance-ai/threads/${threadId}`, {
		metadata,
	});
}

export async function fetchThreadTabs(
	context: IRestApiContext,
	threadId: string,
): Promise<InstanceAiThreadTabsResponse> {
	return await makeRestApiRequest(context, 'GET', `/instance-ai/threads/${threadId}/tabs`);
}

export async function saveThreadTabs(
	context: IRestApiContext,
	threadId: string,
	state: InstanceAiThreadTabsState,
): Promise<InstanceAiThreadTabsResponse> {
	return await makeRestApiRequest(context, 'PUT', `/instance-ai/threads/${threadId}/tabs`, state);
}

/**
 * Persist the thread's pending new-agent artifact under the client-minted id and
 * bind it to the thread in one request. Converges with a concurrent chat build on
 * the same id instead of failing, and the response arriving IS the guarantee that
 * the binding is durable.
 */
export async function persistPendingAgent(
	context: IRestApiContext,
	threadId: string,
	payload: { projectId: string; agentId: string; name: string },
): Promise<{ agent: AgentResource; thread: InstanceAiThreadInfo }> {
	return await makeRestApiRequest(
		context,
		'POST',
		`/instance-ai/threads/${threadId}/agent`,
		payload,
	);
}
