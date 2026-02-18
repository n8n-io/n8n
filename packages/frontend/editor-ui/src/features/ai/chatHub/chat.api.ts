import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';
import type {
	ChatHubSendMessageRequest,
	ChatModelsRequest,
	ChatModelsResponse,
	ChatHubConversationsResponse,
	ChatHubConversationResponse,
	ChatHubRegenerateMessageRequest,
	ChatHubEditMessageRequest,
	ChatSessionId,
	ChatMessageId,
	ChatHubAgentDto,
	ChatHubCreateAgentRequest,
	ChatHubUpdateAgentRequest,
	ChatHubUpdateConversationRequest,
	ChatHubLLMProvider,
	ChatProviderSettingsDto,
	ChatSendMessageResponse,
	ChatReconnectResponse,
	ChatHubUpdateToolRequest,
	ChatHubToolDto,
} from '@n8n/api-types';
import type { INode } from 'n8n-workflow';

export const fetchChatModelsApi = async (
	context: IRestApiContext,
	payload: ChatModelsRequest,
): Promise<ChatModelsResponse> => {
	const apiEndpoint = '/chat/models';
	return await makeRestApiRequest<ChatModelsResponse>(context, 'POST', apiEndpoint, payload);
};

/**
 * Send a message and stream the AI response.
 * Returns immediately; actual content comes via Push events.
 */
export async function sendMessageApi(
	ctx: IRestApiContext,
	payload: ChatHubSendMessageRequest,
): Promise<ChatSendMessageResponse> {
	return await makeRestApiRequest<ChatSendMessageResponse>(
		ctx,
		'POST',
		'/chat/conversations/send',
		payload,
	);
}

/**
 * Edit a message and stream the AI response.
 * Returns immediately; actual content comes via Push events.
 */
export async function editMessageApi(
	ctx: IRestApiContext,
	request: {
		sessionId: ChatSessionId;
		editId: ChatMessageId;
		payload: ChatHubEditMessageRequest;
	},
): Promise<ChatSendMessageResponse> {
	return await makeRestApiRequest<ChatSendMessageResponse>(
		ctx,
		'POST',
		`/chat/conversations/${request.sessionId}/messages/${request.editId}/edit`,
		request.payload,
	);
}

/**
 * Regenerate a message and stream the AI response.
 * Returns immediately; actual content comes via Push events.
 */
export async function regenerateMessageApi(
	ctx: IRestApiContext,
	request: {
		sessionId: ChatSessionId;
		retryId: ChatMessageId;
		payload: ChatHubRegenerateMessageRequest;
	},
): Promise<ChatSendMessageResponse> {
	return await makeRestApiRequest<ChatSendMessageResponse>(
		ctx,
		'POST',
		`/chat/conversations/${request.sessionId}/messages/${request.retryId}/regenerate`,
		request.payload,
	);
}

/**
 * Reconnect to an active chat stream after reconnection
 */
export async function reconnectToSessionApi(
	ctx: IRestApiContext,
	sessionId: ChatSessionId,
	lastSequence?: number,
): Promise<ChatReconnectResponse> {
	const queryParams = lastSequence !== undefined ? `?lastSequence=${lastSequence}` : '';
	return await makeRestApiRequest<ChatReconnectResponse>(
		ctx,
		'POST',
		`/chat/conversations/${sessionId}/reconnect${queryParams}`,
		{},
	);
}

export const stopGenerationApi = async (
	context: IRestApiContext,
	sessionId: ChatSessionId,
	messageId: ChatMessageId,
): Promise<void> => {
	const apiEndpoint = `/chat/conversations/${sessionId}/messages/${messageId}/stop`;
	await makeRestApiRequest(context, 'POST', apiEndpoint);
};

export const fetchConversationsApi = async (
	context: IRestApiContext,
	limit: number,
	cursor?: string,
): Promise<ChatHubConversationsResponse> => {
	const queryParams = new URLSearchParams();
	queryParams.append('limit', limit.toString());
	if (cursor) {
		queryParams.append('cursor', cursor);
	}

	const apiEndpoint = `/chat/conversations?${queryParams.toString()}`;
	return await makeRestApiRequest<ChatHubConversationsResponse>(context, 'GET', apiEndpoint);
};

export const updateConversationApi = async (
	context: IRestApiContext,
	sessionId: ChatSessionId,
	updates: ChatHubUpdateConversationRequest,
): Promise<ChatHubConversationResponse> => {
	const apiEndpoint = `/chat/conversations/${sessionId}`;
	return await makeRestApiRequest<ChatHubConversationResponse>(
		context,
		'PATCH',
		apiEndpoint,
		updates,
	);
};

export const updateConversationTitleApi = async (
	context: IRestApiContext,
	sessionId: ChatSessionId,
	title: string,
): Promise<ChatHubConversationResponse> => {
	return await updateConversationApi(context, sessionId, { title });
};

export const deleteConversationApi = async (
	context: IRestApiContext,
	sessionId: ChatSessionId,
): Promise<void> => {
	const apiEndpoint = `/chat/conversations/${sessionId}`;
	await makeRestApiRequest(context, 'DELETE', apiEndpoint);
};

export const fetchSingleConversationApi = async (
	context: IRestApiContext,
	sessionId: ChatSessionId,
): Promise<ChatHubConversationResponse> => {
	const apiEndpoint = `/chat/conversations/${sessionId}`;
	return await makeRestApiRequest<ChatHubConversationResponse>(context, 'GET', apiEndpoint);
};

export const fetchAgentsApi = async (context: IRestApiContext): Promise<ChatHubAgentDto[]> => {
	const apiEndpoint = '/chat/agents';
	return await makeRestApiRequest<ChatHubAgentDto[]>(context, 'GET', apiEndpoint);
};

export const fetchAgentApi = async (
	context: IRestApiContext,
	agentId: string,
): Promise<ChatHubAgentDto> => {
	const apiEndpoint = `/chat/agents/${agentId}`;
	return await makeRestApiRequest<ChatHubAgentDto>(context, 'GET', apiEndpoint);
};

export const createAgentApi = async (
	context: IRestApiContext,
	payload: ChatHubCreateAgentRequest,
): Promise<ChatHubAgentDto> => {
	const apiEndpoint = '/chat/agents';
	return await makeRestApiRequest<ChatHubAgentDto>(context, 'POST', apiEndpoint, payload);
};

export const updateAgentApi = async (
	context: IRestApiContext,
	agentId: string,
	payload: ChatHubUpdateAgentRequest,
): Promise<ChatHubAgentDto> => {
	const apiEndpoint = `/chat/agents/${agentId}`;
	return await makeRestApiRequest<ChatHubAgentDto>(context, 'POST', apiEndpoint, payload);
};

export const deleteAgentApi = async (context: IRestApiContext, agentId: string): Promise<void> => {
	const apiEndpoint = `/chat/agents/${agentId}`;
	await makeRestApiRequest(context, 'DELETE', apiEndpoint);
};

export const fetchChatSettingsApi = async (
	context: IRestApiContext,
): Promise<Record<ChatHubLLMProvider, ChatProviderSettingsDto>> => {
	const apiEndpoint = '/chat/settings';
	const response = await makeRestApiRequest<{
		providers: Record<ChatHubLLMProvider, ChatProviderSettingsDto>;
	}>(context, 'GET', apiEndpoint);
	return response.providers;
};

export const fetchChatProviderSettingsApi = async (
	context: IRestApiContext,
	provider: ChatHubLLMProvider,
): Promise<ChatProviderSettingsDto> => {
	const apiEndpoint = '/chat/settings/' + provider;
	const response = await makeRestApiRequest<{ settings: ChatProviderSettingsDto }>(
		context,
		'GET',
		apiEndpoint,
	);
	return response.settings;
};

export const updateChatSettingsApi = async (
	context: IRestApiContext,
	settings: ChatProviderSettingsDto,
): Promise<ChatProviderSettingsDto> => {
	const apiEndpoint = '/chat/settings';

	return await makeRestApiRequest<ChatProviderSettingsDto>(context, 'POST', apiEndpoint, {
		payload: settings,
	});
};

export function buildChatAttachmentUrl(
	context: IRestApiContext,
	sessionId: string,
	messageId: string,
	attachmentIndex: number,
): string {
	return `${context.baseUrl}/chat/conversations/${sessionId}/messages/${messageId}/attachments/${attachmentIndex}`;
}

export const fetchToolsApi = async (context: IRestApiContext): Promise<ChatHubToolDto[]> => {
	return await makeRestApiRequest<ChatHubToolDto[]>(context, 'GET', '/chat/tools');
};

export const createToolApi = async (
	context: IRestApiContext,
	definition: INode,
): Promise<ChatHubToolDto> => {
	return await makeRestApiRequest<ChatHubToolDto>(context, 'POST', '/chat/tools', { definition });
};

export const updateToolApi = async (
	context: IRestApiContext,
	toolId: string,
	updates: ChatHubUpdateToolRequest,
): Promise<ChatHubToolDto> => {
	return await makeRestApiRequest<ChatHubToolDto>(
		context,
		'PATCH',
		`/chat/tools/${toolId}`,
		updates,
	);
};

export const deleteToolApi = async (context: IRestApiContext, toolId: string): Promise<void> => {
	await makeRestApiRequest(context, 'DELETE', `/chat/tools/${toolId}`);
};
