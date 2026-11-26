import type {
	AssistantSetupCredentialMetadataResponse,
	AssistantThreadTabsResponse,
	AssistantThreadTabsState,
} from '@n8n/api-types';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';

export async function fetchAssistantAgentThreadTabs(
	context: IRestApiContext,
	threadId: string,
): Promise<AssistantThreadTabsResponse> {
	return await makeRestApiRequest(context, 'GET', `/assistant/threads/${threadId}/tabs`);
}

export async function fetchAssistantAgentThreadCredits(
	context: IRestApiContext,
	threadId: string,
): Promise<{ creditsUsed: number | null }> {
	return await makeRestApiRequest(context, 'GET', `/assistant/threads/${threadId}/credits`);
}

export async function saveAssistantAgentThreadTabs(
	context: IRestApiContext,
	threadId: string,
	state: AssistantThreadTabsState,
): Promise<AssistantThreadTabsResponse> {
	return await makeRestApiRequest(context, 'PUT', `/assistant/threads/${threadId}/tabs`, state);
}

/** The credential choices that the setup panel saved in the thread metadata. */
export async function fetchAssistantAgentSetupCredentials(
	context: IRestApiContext,
	threadId: string,
): Promise<AssistantSetupCredentialMetadataResponse> {
	return await makeRestApiRequest(
		context,
		'GET',
		`/assistant/threads/${threadId}/setup-credentials`,
	);
}

export async function saveAssistantAgentSetupCredentials(
	context: IRestApiContext,
	threadId: string,
	metadata: Record<string, unknown>,
): Promise<AssistantSetupCredentialMetadataResponse> {
	return await makeRestApiRequest(
		context,
		'PATCH',
		`/assistant/threads/${threadId}/setup-credentials`,
		{ metadata },
	);
}
