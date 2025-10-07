import { makeRestApiRequest, streamRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';
import type { ChatModelsRequest, ChatModelsResponse } from '@n8n/api-types';
import type { StreamOutput } from './chat.types';
import type { INodeCredentials } from 'n8n-workflow';

export const fetchChatModelsApi = async (
	context: IRestApiContext,
	payload: ChatModelsRequest,
): Promise<ChatModelsResponse> => {
	const apiEndpoint = '/chat/models';
	return await makeRestApiRequest<ChatModelsResponse>(context, 'POST', apiEndpoint, payload);
};

export const messageChatApi = (
	ctx: IRestApiContext,
	provider: 'openai',
	payload: {
		provider: string;
		model: string;
		messageId: string;
		sessionId: string;
		message: string;
		credentials: INodeCredentials;
	},
	onMessageUpdated: (data: StreamOutput) => void,
	onDone: () => void,
	onError: (e: Error) => void,
): void => {
	void streamRequest<StreamOutput>(
		ctx,
		'/chat/agents/n8n',
		payload,
		onMessageUpdated,
		onDone,
		onError,
	);
};
