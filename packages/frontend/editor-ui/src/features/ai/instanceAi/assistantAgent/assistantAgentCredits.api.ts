import type { AssistantThreadCreditsResponse } from '@n8n/api-types';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';

export async function fetchAssistantAgentThreadCredits(
	context: IRestApiContext,
	threadId: string,
): Promise<AssistantThreadCreditsResponse> {
	return await makeRestApiRequest(context, 'GET', `/assistant/threads/${threadId}/credits`);
}
