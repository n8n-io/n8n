import type { IRestApiContext } from '@/Interface';
import type { ChatRequest, ReplaceCodeRequest } from '@/types/assistant.types';
import { makeRestApiRequest, streamRequest } from '@/utils/apiUtils';

export function chatWithAssistant(
	ctx: IRestApiContext,
	payload: ChatRequest.RequestPayload,
	onMessageUpdated: (data: ChatRequest.ResponsePayload) => void,
	onDone: () => void,
	onError: (e: Error) => void,
): void {
	void streamRequest<ChatRequest.ResponsePayload>(
		ctx,
		'/ai-assistant/chat',
		payload,
		onMessageUpdated,
		onDone,
		onError,
	);
}

export async function replaceCode(
	context: IRestApiContext,
	data: ReplaceCodeRequest.RequestPayload,
): Promise<ReplaceCodeRequest.ResponsePayload> {
	return await makeRestApiRequest<ReplaceCodeRequest.ResponsePayload>(
		context,
		'POST',
		'/ai-assistant/chat/apply-suggestion',
		data,
	);
}
