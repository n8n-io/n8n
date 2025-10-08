import { makeRestApiRequest, streamRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';
import type { ChatModelsRequest, ChatModelsResponse } from '@n8n/api-types';
import type { StructuredChunk } from './chat.types';
import type { INodeCredentials } from 'n8n-workflow';

export const fetchChatModelsApi = async (
	context: IRestApiContext,
	payload: ChatModelsRequest,
): Promise<ChatModelsResponse> => {
	const apiEndpoint = '/chat/models';
	return await makeRestApiRequest<ChatModelsResponse>(context, 'POST', apiEndpoint, payload);
};

export const sendText = (
	ctx: IRestApiContext,
	payload: {
		message: string;
		provider: string;
		model: string;
		messageId: string;
		sessionId: string;
		credentials: INodeCredentials;
	},
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
