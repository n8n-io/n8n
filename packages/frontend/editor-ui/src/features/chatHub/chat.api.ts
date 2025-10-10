import { makeRestApiRequest, streamRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';
import type {
	ChatHubSendMessageRequest,
	ChatModelsRequest,
	ChatModelsResponse,
	ChatHubConversationsResponse,
	ChatHubMessagesResponse,
} from '@n8n/api-types';
import type { StructuredChunk } from './chat.types';

export const fetchChatModelsApi = async (
	context: IRestApiContext,
	payload: ChatModelsRequest,
): Promise<ChatModelsResponse> => {
	const apiEndpoint = '/chat/models';
	return await makeRestApiRequest<ChatModelsResponse>(context, 'POST', apiEndpoint, payload);
};

export function sendText(
	ctx: IRestApiContext,
	payload: ChatHubSendMessageRequest,
	onMessageUpdated: (data: StructuredChunk) => void,
	onDone: () => void,
	onError: (e: Error) => void,
) {
	void streamRequest<StructuredChunk>(
		ctx,
		'/chat/send',
		payload,
		onMessageUpdated,
		onDone,
		onError,
		'\n',
	);
}

export const fetchConversationsApi = async (
	context: IRestApiContext,
): Promise<ChatHubConversationsResponse> => {
	const apiEndpoint = '/chat/conversations';
	return await makeRestApiRequest<ChatHubConversationsResponse>(context, 'GET', apiEndpoint);
};

export const fetchConversationMessagesApi = async (
	context: IRestApiContext,
	conversationId: string,
): Promise<ChatHubMessagesResponse> => {
	const apiEndpoint = `/chat/conversations/${conversationId}/messages`;
	return await makeRestApiRequest<ChatHubMessagesResponse>(context, 'GET', apiEndpoint);
};
