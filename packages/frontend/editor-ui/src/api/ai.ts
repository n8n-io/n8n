import { useAIAssistantHelpers } from '@/composables/useAIAssistantHelpers';
import { AI_ASSISTANT_MAX_CONTENT_LENGTH } from '@/constants';
import type { ICredentialsResponse, IRestApiContext } from '@/Interface';
import type { AskAiRequest, ChatRequest, ReplaceCodeRequest } from '@/types/assistant.types';
import { makeRestApiRequest, streamRequest } from '@/utils/apiUtils';
import { getObjectSizeInKB } from '@/utils/objectUtils';
import type { IDataObject } from 'n8n-workflow';

export function chatWithAssistant(
	ctx: IRestApiContext,
	payload: ChatRequest.RequestPayload,
	onMessageUpdated: (data: ChatRequest.ResponsePayload) => void,
	onDone: () => void,
	onError: (e: Error) => void,
): void {
	try {
		const payloadSize = getObjectSizeInKB(payload.payload);
		if (payloadSize > AI_ASSISTANT_MAX_CONTENT_LENGTH) {
			useAIAssistantHelpers().trimPayloadSize(payload);
		}
	} catch (e) {
		onError(e);
		return;
	}
	void streamRequest<ChatRequest.ResponsePayload>(
		ctx,
		'/ai/chat',
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
		'/ai/chat/apply-suggestion',
		data,
	);
}

export async function generateCodeForPrompt(
	ctx: IRestApiContext,
	{ question, context, forNode }: AskAiRequest.RequestPayload,
): Promise<{ code: string }> {
	return await makeRestApiRequest(ctx, 'POST', '/ai/ask-ai', {
		question,
		context,
		forNode,
	} as IDataObject);
}

export async function claimFreeAiCredits(
	ctx: IRestApiContext,
	{ projectId }: { projectId?: string },
): Promise<ICredentialsResponse> {
	return await makeRestApiRequest(ctx, 'POST', '/ai/free-credits', {
		projectId,
	} as IDataObject);
}
