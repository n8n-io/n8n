import type { LoadPreviousSessionResponse, SendMessageResponse } from '@n8n/chat/types';

export function createFetchResponse<T>(data: T) {
	const jsonData = JSON.stringify(data);

	return async () =>
		({
			json: async () => await new Promise<T>((resolve) => resolve(data)),
			text: async () => jsonData,
			clone() {
				return this;
			},
		}) as unknown as Response;
}

export const createGetLatestMessagesResponse = (
	data: LoadPreviousSessionResponse['data'] = [],
): LoadPreviousSessionResponse => ({ data });

export const createSendMessageResponse = (
	output: SendMessageResponse['output'],
): SendMessageResponse => ({
	output,
});

export function createMockStreamingFetchResponse(
	chunks: Array<{
		type: string;
		content?: string;
		metadata?: { nodeId: string; nodeName: string; timestamp: number };
	}>,
) {
	return async () => {
		const encoder = new TextEncoder();
		const stream = new ReadableStream({
			start(controller) {
				chunks.forEach((chunk) => {
					const data = JSON.stringify(chunk) + '\n';
					controller.enqueue(encoder.encode(data));
				});
				controller.close();
			},
		});

		return {
			ok: true,
			status: 200,
			body: stream,
			headers: new Headers(),
		} as Response;
	};
}
