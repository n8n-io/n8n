import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';
import type {
	InstanceAiThreadInfo,
	InstanceAiThreadListResponse,
	InstanceAiThreadContextResponse,
	InstanceAiRichMessagesResponse,
	InstanceAiThreadStatusResponse,
} from '@n8n/api-types';

export async function fetchMemory(
	context: IRestApiContext,
	threadId: string,
): Promise<{ content: string; template: string }> {
	return await makeRestApiRequest(context, 'GET', `/instance-ai/memory/${threadId}`);
}

export async function updateMemory(
	context: IRestApiContext,
	threadId: string,
	content: string,
): Promise<void> {
	await makeRestApiRequest(context, 'PUT', `/instance-ai/memory/${threadId}`, { content });
}

export async function fetchThreads(
	context: IRestApiContext,
): Promise<InstanceAiThreadListResponse> {
	return await makeRestApiRequest(context, 'GET', '/instance-ai/threads');
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

export async function fetchThreadMessages(
	context: IRestApiContext,
	threadId: string,
	limit?: number,
	page?: number,
): Promise<InstanceAiRichMessagesResponse> {
	const params = new URLSearchParams();
	if (limit !== undefined) params.set('limit', String(limit));
	if (page !== undefined) params.set('page', String(page));
	const qs = params.toString();
	return await makeRestApiRequest(
		context,
		'GET',
		`/instance-ai/threads/${threadId}/messages${qs ? `?${qs}` : ''}`,
	);
}

export async function fetchThreadStatus(
	context: IRestApiContext,
	threadId: string,
): Promise<InstanceAiThreadStatusResponse> {
	return await makeRestApiRequest(context, 'GET', `/instance-ai/threads/${threadId}/status`);
}

export async function fetchThreadContext(
	context: IRestApiContext,
	threadId: string,
): Promise<InstanceAiThreadContextResponse> {
	return await makeRestApiRequest(context, 'GET', `/instance-ai/threads/${threadId}/context`);
}
