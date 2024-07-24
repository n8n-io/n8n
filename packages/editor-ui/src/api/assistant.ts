import type { IRestApiContext } from '@/Interface';
import type { ChatRequest, ReplaceCodeRequest } from '@/types/assistant.types';
import { jsonParse } from 'n8n-workflow';

const debugLog = [];

// @ts-ignore
window.debugChat = () => {
	console.log(debugLog);
};

export const postFetch = async (
	context: IRestApiContext,
	apiEndpoint: string,
	payload: object,
): Promise<object> => {
	const headers = {
		'Content-Type': 'application/json',
	};
	const request = {
		headers,
		method: 'POST',
		credentials: 'include',
		body: JSON.stringify(payload),
	};
	debugLog.push({ request: { ...request, endpoint: `${context.baseUrl}${apiEndpoint}` } });
	const response = await fetch(`${context.baseUrl}${apiEndpoint}`);

	debugLog.push({ response });
	if (response.ok && response.body) {
		return await response.json();
	} else {
		throw new Error(response.statusText);
	}
};

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
	const request: RequestInit = {
		headers,
		method: 'POST',
		credentials: 'include',
		body: JSON.stringify(payload),
	};
	debugLog.push({ request: { ...request, endpoint: `${context.baseUrl}${apiEndpoint}` } });
	const response = await fetch(`${context.baseUrl}${apiEndpoint}`, request);

	debugLog.push({ response });
	if (response.ok && response.body) {
		// Handle the streaming response
		const reader = response.body.getReader();
		const decoder = new TextDecoder('utf-8');

		async function readStream() {
			const { done, value } = await reader.read();
			if (done) {
				debugLog.push({ done });
				onDone?.();
				return;
			}

			const chunk = decoder.decode(value);
			debugLog.push({ chunk });
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
	const data = await postFetch(ctx, '/ai-proxy/v1/chat/apply-suggestion', payload);

	return data as unknown as ReplaceCodeRequest.ResponsePayload;
}
