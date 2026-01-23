import { makeRestApiRequest, streamRequest } from '@n8n/rest-api-client';
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
	MessageChunk,
	ChatHubLLMProvider,
	ChatProviderSettingsDto,
} from '@n8n/api-types';

// Workflows stream data as newline separated JSON objects (jsonl)
const STREAM_SEPARATOR = '\n';

export const fetchChatModelsApi = async (
	context: IRestApiContext,
	payload: ChatModelsRequest,
): Promise<ChatModelsResponse> => {
	const apiEndpoint = '/chat/models';
	return await makeRestApiRequest<ChatModelsResponse>(context, 'POST', apiEndpoint, payload);
};

export function sendMessageApi(
	ctx: IRestApiContext,
	payload: ChatHubSendMessageRequest,
	onMessageUpdated: (data: MessageChunk) => void,
	onDone: () => void,
	onError: (e: Error) => void,
) {
	void streamRequest<MessageChunk>(
		ctx,
		'/chat/conversations/send',
		payload,
		onMessageUpdated,
		onDone,
		onError,
		STREAM_SEPARATOR,
	);
}

export function editMessageApi(
	ctx: IRestApiContext,
	request: { sessionId: ChatSessionId; editId: ChatMessageId; payload: ChatHubEditMessageRequest },
	onMessageUpdated: (data: MessageChunk) => void,
	onDone: () => void,
	onError: (e: Error) => void,
) {
	void streamRequest<MessageChunk>(
		ctx,
		`/chat/conversations/${request.sessionId}/messages/${request.editId}/edit`,
		request.payload,
		onMessageUpdated,
		onDone,
		onError,
		STREAM_SEPARATOR,
	);
}

export function regenerateMessageApi(
	ctx: IRestApiContext,
	request: {
		sessionId: ChatSessionId;
		retryId: ChatMessageId;
		payload: ChatHubRegenerateMessageRequest;
	},
	onMessageUpdated: (data: MessageChunk) => void,
	onDone: () => void,
	onError: (e: Error) => void,
) {
	void streamRequest<MessageChunk>(
		ctx,
		`/chat/conversations/${request.sessionId}/messages/${request.retryId}/regenerate`,
		request.payload,
		onMessageUpdated,
		onDone,
		onError,
		STREAM_SEPARATOR,
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
