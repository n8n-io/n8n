import { useAIAssistantHelpers } from '@/features/assistant/composables/useAIAssistantHelpers';
import { AI_ASSISTANT_MAX_CONTENT_LENGTH } from '@/constants';
import type { ICredentialsResponse } from '@/Interface';
import type { IRestApiContext } from '@n8n/rest-api-client';
import type {
	AskAiRequest,
	ChatRequest,
	ReplaceCodeRequest,
} from '@/features/assistant/assistant.types';
import { makeRestApiRequest, streamRequest } from '@n8n/rest-api-client';
import { getObjectSizeInKB } from '@/utils/objectUtils';
import type { IDataObject } from 'n8n-workflow';

export function chatWithBuilder(
	ctx: IRestApiContext,
	payload: ChatRequest.RequestPayload,
	onMessageUpdated: (data: ChatRequest.ResponsePayload) => void,
	onDone: () => void,
	onError: (e: Error) => void,
	abortSignal?: AbortSignal,
	useDeprecatedCredentials = false,
): void {
	void streamRequest<ChatRequest.ResponsePayload>(
		ctx,
		'/ai/build',
		{
			...payload,
			payload: {
				...payload.payload,
				useDeprecatedCredentials,
			},
		},
		onMessageUpdated,
		onDone,
		onError,
		undefined,
		abortSignal,
	);
}

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

export async function getAiSessions(
	ctx: IRestApiContext,
	workflowId?: string,
): Promise<{
	sessions: Array<{
		sessionId: string;
		messages: ChatRequest.MessageResponse[];
		lastUpdated: string;
	}>;
}> {
	return await makeRestApiRequest(ctx, 'POST', '/ai/sessions', {
		workflowId,
	} as IDataObject);
}

export async function getBuilderCredits(ctx: IRestApiContext): Promise<{
	creditsQuota: number;
	creditsClaimed: number;
}> {
	return await makeRestApiRequest(ctx, 'GET', '/ai/build/credits');
}
