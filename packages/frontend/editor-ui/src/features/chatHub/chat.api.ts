import { makeRestApiRequest, streamRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';
import type { ChatModelsRequest, ChatModelsResponse } from '@n8n/api-types';
import type { StreamOutput } from './chat.types';

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
