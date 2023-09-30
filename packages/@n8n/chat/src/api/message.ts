import { get, post } from '@/api/generic';
import type { ChatOptions, LoadPreviousSessionResponse, SendMessageResponse } from '@/types';

export async function loadPreviousSession(sessionId: string, options: ChatOptions) {
	const method = options.webhookConfig?.method === 'POST' ? post : get;
	return method<LoadPreviousSessionResponse>(
		`${options.webhookUrl}`,
		{
			action: 'loadPreviousSession',
			sessionId,
		},
		{
			headers: options.webhookConfig?.headers,
		},
	);
}

export async function sendMessage(message: string, sessionId: string, options: ChatOptions) {
	const method = options.webhookConfig?.method === 'POST' ? post : get;
	return method<SendMessageResponse>(
		`${options.webhookUrl}`,
		{
			action: 'sendMessage',
			sessionId,
			message,
		},
		{
			headers: options.webhookConfig?.headers,
		},
	);
}
