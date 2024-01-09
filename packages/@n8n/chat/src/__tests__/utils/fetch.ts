import type { LoadPreviousSessionResponse, SendMessageResponse } from '@n8n/chat/types';

export function createFetchResponse<T>(data: T) {
	return async () =>
		({
			json: async () => new Promise<T>((resolve) => resolve(data)),
		}) as Response;
}

export const createGetLatestMessagesResponse = (
	data: LoadPreviousSessionResponse['data'] = [],
): LoadPreviousSessionResponse => ({ data });

export const createSendMessageResponse = (
	output: SendMessageResponse['output'],
): SendMessageResponse => ({
	output,
});
