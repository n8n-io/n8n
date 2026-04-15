import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';
import type {
	InstanceAiThreadInfo,
	InstanceAiThreadListResponse,
	InstanceAiRichMessagesResponse,
	InstanceAiThreadStatusResponse,
} from '@n8n/api-types';

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

export async function updateThreadMetadata(
	context: IRestApiContext,
	threadId: string,
	metadata: Record<string, unknown>,
): Promise<{ thread: InstanceAiThreadInfo }> {
	return await makeRestApiRequest(context, 'PATCH', `/instance-ai/threads/${threadId}`, {
		metadata,
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
