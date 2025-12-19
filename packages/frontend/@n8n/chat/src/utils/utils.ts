import { v4 as uuid } from 'uuid';

import type { ChatMessage } from '../types';

interface ChatNodeMessageWithButtons {
	type: 'with-buttons';
	text: string;
	buttons: Array<{
		text: string;
		link: string;
		type: string;
	}>;
}

export function constructChatWebsocketUrl(
	url: string,
	executionId: string,
	sessionId: string,
	isPublic: boolean,
) {
	const baseUrl = new URL(url).origin;
	const wsProtocol = baseUrl.startsWith('https') ? 'wss' : 'ws';
	const wsUrl = baseUrl.replace(/^https?/, wsProtocol);
	return `${wsUrl}/chat?sessionId=${sessionId}&executionId=${executionId}${isPublic ? '&isPublic=true' : ''}`;
}

export function parseBotChatMessageContent(message: string): ChatMessage {
	const id = uuid();
	let chatMessage: ChatMessage = {
		id,
		sender: 'bot',
		text: message,
	};
	try {
		const parsed = JSON.parse(message) as ChatNodeMessageWithButtons;
		if (parsed.type === 'with-buttons') {
			chatMessage = {
				id,
				sender: 'bot',
				type: 'component',
				key: 'with-buttons',
				arguments: {
					text: parsed.text,
					buttons: parsed.buttons,
				},
			};
		}
	} catch {
		// ignore error as the message might be just a string
	}
	return chatMessage;
}
