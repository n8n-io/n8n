import type { IRestApiContext } from '@/Interface';
import type { ChatRequest, ReplaceCodeRequest } from '@/types/assistant.types';
import { jsonParse } from 'n8n-workflow';

export const streamRequest = async (
	context: IRestApiContext,
	apiEndpoint: string,
	payload: object,
	onChunk?: (chunk: object) => void,
	onDone?: () => void,
	onError?: (e: Error) => void,
): Promise<void> => {
	const headers = {
		'Content-Type': 'application/json',
	};
	const response = await fetch(`${context.baseUrl}${apiEndpoint}`, {
		headers,
		method: 'POST',
		credentials: 'include',
		body: JSON.stringify(payload),
	});

	if (response.ok && response.body) {
		// Handle the streaming response
		const reader = response.body.getReader();
		const decoder = new TextDecoder('utf-8');

		async function readStream() {
			const { done, value } = await reader.read();
			if (done) {
				onDone?.();
				return;
			}

			const chunk = decoder.decode(value);
			const splitChunks = chunk.split('\n');

			for (const splitChunk of splitChunks) {
				if (splitChunk && onChunk) {
					try {
						onChunk(jsonParse(splitChunk, { errorMessage: 'Invalid json chunk in stream' }));
					} catch (e: unknown) {
						if (e instanceof Error) {
							console.log(`${e.message}: ${splitChunk}`);
							onError?.(e);
						}
					}
				}
			}
			await readStream();
		}

		// Start reading the stream
		await readStream();
	} else if (onError) {
		onError(new Error(response.statusText));
	}
};

export function chatWithAssistant(
	ctx: IRestApiContext,
	payload: ChatRequest.RequestPayload,
	onMessageUpdated: (data: ChatRequest.ResponsePayload) => void,
	onDone: () => void,
	onError: (e: Error) => void,
): void {
	// todo better type handling
	void streamRequest(ctx, '/ai-proxy/v1/chat', payload, onMessageUpdated, onDone, onError);
}

export async function replaceCode(
	ctx: IRestApiContext,
	payload: ReplaceCodeRequest.RequestPayload,
): Promise<ReplaceCodeRequest.ResponsePayload> {
	return {
		parameters: {
			jsCode: '/** code **/',
		},
	};
	// return await makeRestApiRequest(ctx, 'POST', '/ai-proxy/apply-code-diff', payload);
}
