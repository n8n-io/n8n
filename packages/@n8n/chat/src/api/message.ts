import { get, post, postWithFiles } from '@n8n/chat/api/generic';
import type {
	ChatOptions,
	LoadPreviousSessionResponse,
	SendMessageResponse,
} from '@n8n/chat/types';

export async function loadPreviousSession(sessionId: string, options: ChatOptions) {
	const method = options.webhookConfig?.method === 'POST' ? post : get;
	return await method<LoadPreviousSessionResponse>(
		`${options.webhookUrl}`,
		{
			action: 'loadPreviousSession',
			[options.chatSessionKey as string]: sessionId,
			...(options.metadata ? { metadata: options.metadata } : {}),
		},
		{
			headers: options.webhookConfig?.headers,
		},
	);
}

export async function sendMessage(
	message: string,
	files: File[],
	sessionId: string,
	options: ChatOptions,
) {
	if (files.length > 0) {
		return await postWithFiles<SendMessageResponse>(
			`${options.webhookUrl}`,
			{
				action: 'sendMessage',
				[options.chatSessionKey as string]: sessionId,
				[options.chatInputKey as string]: message,
				...(options.metadata ? { metadata: options.metadata } : {}),
			},
			files,
			{
				headers: options.webhookConfig?.headers,
			},
		);
	}
	const method = options.webhookConfig?.method === 'POST' ? post : get;
	return await method<SendMessageResponse>(
		`${options.webhookUrl}`,
		{
			action: 'sendMessage',
			[options.chatSessionKey as string]: sessionId,
			[options.chatInputKey as string]: message,
			...(options.metadata ? { metadata: options.metadata } : {}),
		},
		{
			headers: options.webhookConfig?.headers,
		},
	);
}
