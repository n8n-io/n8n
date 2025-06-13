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
