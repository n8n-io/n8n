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
	payload: ChatHubEditMessageRequest,
	onMessageUpdated: (data: StructuredChunk) => void,
	onDone: () => void,
	onError: (e: Error) => void,
) {
	void streamRequest<StructuredChunk>(
		ctx,
		'/chat/conversations/edit',
		payload,
		onMessageUpdated,
		onDone,
		onError,
		STREAM_SEPARATOR,
	);
}

export function regenerateMessageApi(
	ctx: IRestApiContext,
	payload: ChatHubRegenerateMessageRequest,
	onMessageUpdated: (data: StructuredChunk) => void,
	onDone: () => void,
	onError: (e: Error) => void,
) {
	void streamRequest<StructuredChunk>(
		ctx,
		'/chat/conversations/regenerate',
		payload,
		onMessageUpdated,
		onDone,
		onError,
		STREAM_SEPARATOR,
	);
}

export const fetchConversationsApi = async (
	context: IRestApiContext,
): Promise<ChatHubConversationsResponse> => {
	const apiEndpoint = '/chat/conversations';
	return await makeRestApiRequest<ChatHubConversationsResponse>(context, 'GET', apiEndpoint);
};

export const updateConversationTitleApi = async (
	context: IRestApiContext,
	conversationId: ChatSessionId,
	title: string,
): Promise<ChatHubConversationResponse> => {
	const apiEndpoint = `/chat/conversations/${conversationId}/rename`;
	return await makeRestApiRequest<ChatHubConversationResponse>(context, 'POST', apiEndpoint, {
		title,
	});
};

export const deleteConversationApi = async (
	context: IRestApiContext,
	conversationId: ChatSessionId,
): Promise<void> => {
	const apiEndpoint = `/chat/conversations/${conversationId}`;
	await makeRestApiRequest(context, 'DELETE', apiEndpoint);
};

export const fetchSingleConversationApi = async (
	context: IRestApiContext,
	conversationId: ChatSessionId,
): Promise<ChatHubConversationResponse> => {
	const apiEndpoint = `/chat/conversations/${conversationId}`;
	return await makeRestApiRequest<ChatHubConversationResponse>(context, 'GET', apiEndpoint);
};
