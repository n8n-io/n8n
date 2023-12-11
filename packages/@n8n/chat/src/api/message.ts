import { get, post } from '@/api/generic';
import type { ChatOptions, LoadPreviousSessionResponse, SendMessageResponse } from '@/types';

export async function loadPreviousSession(sessionId: string, options: ChatOptions) {
	const method = options.webhookConfig?.method === 'POST' ? post : get;
	return method<LoadPreviousSessionResponse>(
		`${options.webhookUrl}`,
		{
			action: 'loadPreviousSession',
			[options.chatHistoryKey as string]: sessionId,
			...(options.metadata ? { metadata: options.metadata } : {}),
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
			[options.chatHistoryKey as string]: sessionId,
			[options.chatInputKey as string]: message,
			...(options.metadata ? { metadata: options.metadata } : {}),
		},
		{
			headers: options.webhookConfig?.headers,
		},
	);
}
