import { sseStreamRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';
import type { InstanceAiStreamChunk } from './instanceAi.types';

/**
 * Sends a message to the Instance AI agent via streaming.
 * Uses @n8n/rest-api-client sseStreamRequest for SSE-based streaming.
 */
export async function sendInstanceAiMessage(
	context: IRestApiContext,
	threadId: string,
	message: string,
	onChunk: (chunk: InstanceAiStreamChunk) => void,
	onDone: () => void,
	onError: (error: Error) => void,
	abortSignal?: AbortSignal,
): Promise<void> {
	await sseStreamRequest<InstanceAiStreamChunk>(
		context,
		`/instance-ai/chat/${threadId}`,
		{ message },
		onChunk,
		onDone,
		onError,
		abortSignal,
	);
}
