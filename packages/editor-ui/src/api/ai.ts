import type { IRestApiContext, Schema } from '@/Interface';
import type { ChatRequest, ReplaceCodeRequest } from '@/types/assistant.types';
import { makeRestApiRequest, streamRequest } from '@/utils/apiUtils';
import type { IDataObject } from 'n8n-workflow';

export function chatWithAssistant(
	ctx: IRestApiContext,
	payload: ChatRequest.RequestPayload,
	onMessageUpdated: (data: ChatRequest.ResponsePayload) => void,
	onDone: () => void,
	onError: (e: Error) => void,
): void {
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
	{
		question,
		context,
		model,
		n8nVersion,
	}: {
		question: string;
		context: {
			schema: Array<{ nodeName: string; schema: Schema }>;
			inputSchema: { nodeName: string; schema: Schema };
			pushRef: string;
			ndvPushRef: string;
		};
		model: string;
		n8nVersion: string;
		forNode: 'code' | 'transform';
	},
): Promise<{ code: string }> {
	return await makeRestApiRequest(ctx, 'POST', '/ai/ask-ai', {
		question,
		context,
		model,
		n8nVersion,
	} as IDataObject);
}
