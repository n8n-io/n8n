import { makeRestApiRequest, streamRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';
import type {
	ChatHubSendMessageRequest,
	ChatModelsRequest,
	ChatModelsResponse,
} from '@n8n/api-types';
import type { StructuredChunk } from './chat.types';

export const fetchChatModelsApi = async (
	context: IRestApiContext,
	payload: ChatModelsRequest,
): Promise<ChatModelsResponse> => {
	const apiEndpoint = '/chat/models';
	return await makeRestApiRequest<ChatModelsResponse>(context, 'POST', apiEndpoint, payload);
};

export const sendText = (
	ctx: IRestApiContext,
	payload: ChatHubSendMessageRequest,
	onMessageUpdated: (data: StructuredChunk) => void,
	onDone: () => void,
	onError: (e: Error) => void,
): void => {
	void streamRequest<StructuredChunk>(
		ctx,
		'/chat/send',
		payload,
		onMessageUpdated,
		onDone,
		onError,
		'\n',
	);
};
