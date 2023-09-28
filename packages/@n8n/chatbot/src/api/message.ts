import { get } from '@/api/generic';
import type { ChatbotOptions, LoadPreviousSessionResponse, SendMessageResponse } from '@/types';

export async function loadPreviousSession(sessionId: string, options: ChatbotOptions) {
	return get<LoadPreviousSessionResponse>(`${options.webhookUrl}`, {
		action: 'loadPreviousSession',
		sessionId,
	});
}

export async function sendMessage(message: string, sessionId: string, options: ChatbotOptions) {
	return get<SendMessageResponse>(`${options.webhookUrl}`, {
		action: 'sendMessage',
		sessionId,
		message,
	});
}
