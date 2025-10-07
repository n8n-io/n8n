import { makeRestApiRequest, streamRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';
import type { StreamOutput, ChatHubConversationModel } from './chat.types';

export const fetchChatModelsApi = async (context: IRestApiContext) => {
	const apiEndpoint = '/chat/models';
	return await makeRestApiRequest<ChatHubConversationModel[]>(context, 'GET', apiEndpoint);
};

export const messageChatApi = (
	ctx: IRestApiContext,
	provider: 'openai',
	payload: { model: string; messageId: string; sessionId: string; message: string },
	onMessageUpdated: (data: StreamOutput) => void,
	onDone: () => void,
	onError: (e: Error) => void,
): void => {
	void streamRequest<StreamOutput>(
		ctx,
		`/chat/agents/${provider}`,
		payload,
		onMessageUpdated,
		onDone,
		onError,
	);
};
