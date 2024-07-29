import type { IRestApiContext } from '@/Interface';
import type { ChatRequest, ReplaceCodeRequest } from '@/types/assistant.types';
import { postFetch, streamRequest } from '@/utils/apiUtils';

export function chatWithAssistant(
	ctx: IRestApiContext,
	payload: ChatRequest.RequestPayload,
	onMessageUpdated: (data: ChatRequest.ResponsePayload) => void,
	onDone: () => void,
	onError: (e: Error) => void,
): void {
	void streamRequest(ctx, '/ai-proxy/v1/chat', payload, onMessageUpdated, onDone, onError);
}

export async function replaceCode(
	ctx: IRestApiContext,
	payload: ReplaceCodeRequest.RequestPayload,
): Promise<ReplaceCodeRequest.ResponsePayload> {
	const data = await postFetch(ctx, '/ai-proxy/v1/chat/apply-suggestion', payload);

	return data as unknown as ReplaceCodeRequest.ResponsePayload;
}
