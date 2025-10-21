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
} from '@n8n/api-types';
import type { StructuredChunk } from './chat.types';

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
	onMessageUpdated: (data: StructuredChunk) => void,
	onDone: () => void,
	onError: (e: Error) => void,
) {
	void streamRequest<StructuredChunk>(
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
	sessionId: ChatSessionId,
	editId: ChatMessageId,
	payload: ChatHubEditMessageRequest,
	onMessageUpdated: (data: StructuredChunk) => void,
	onDone: () => void,
	onError: (e: Error) => void,
) {
	void streamRequest<StructuredChunk>(
		ctx,
		`/chat/conversations/${sessionId}/messages/${editId}/edit`,
		payload,
		onMessageUpdated,
		onDone,
		onError,
		STREAM_SEPARATOR,
	);
}

export function regenerateMessageApi(
	ctx: IRestApiContext,
	sessionId: ChatSessionId,
	retryId: ChatMessageId,
	payload: ChatHubRegenerateMessageRequest,
	onMessageUpdated: (data: StructuredChunk) => void,
	onDone: () => void,
	onError: (e: Error) => void,
) {
	void streamRequest<StructuredChunk>(
		ctx,
		`/chat/conversations/${sessionId}/messages/${retryId}/regenerate`,
		payload,
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
): Promise<ChatHubConversationsResponse> => {
	const apiEndpoint = '/chat/conversations';
	return await makeRestApiRequest<ChatHubConversationsResponse>(context, 'GET', apiEndpoint);
};

export const updateConversationTitleApi = async (
	context: IRestApiContext,
	sessionId: ChatSessionId,
	title: string,
): Promise<ChatHubConversationResponse> => {
	const apiEndpoint = `/chat/conversations/${sessionId}/rename`;
	return await makeRestApiRequest<ChatHubConversationResponse>(context, 'POST', apiEndpoint, {
		title,
	});
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
