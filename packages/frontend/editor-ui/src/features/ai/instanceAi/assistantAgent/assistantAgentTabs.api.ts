import type { AssistantThreadTabsResponse, AssistantThreadTabsState } from '@n8n/api-types';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';

export async function fetchAssistantAgentThreadTabs(
	context: IRestApiContext,
	threadId: string,
): Promise<AssistantThreadTabsResponse> {
	return await makeRestApiRequest(context, 'GET', `/assistant/threads/${threadId}/tabs`);
}

export async function saveAssistantAgentThreadTabs(
	context: IRestApiContext,
	threadId: string,
	state: AssistantThreadTabsState,
): Promise<AssistantThreadTabsResponse> {
	return await makeRestApiRequest(context, 'PUT', `/assistant/threads/${threadId}/tabs`, state);
}
