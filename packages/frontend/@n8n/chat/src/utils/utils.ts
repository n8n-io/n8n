import { v4 as uuid } from 'uuid';

import { MessageComponentKey } from '../constants';
import type { ChatMessage } from '../types';

const CHAT_NODE_MESSAGE_WITH_BUTTONS_TYPE = 'with-buttons';

interface ChatNodeMessageWithButtons {
	type: typeof CHAT_NODE_MESSAGE_WITH_BUTTONS_TYPE;
	text: string;
	blockUserInput: boolean;
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
		if (parsed.type === CHAT_NODE_MESSAGE_WITH_BUTTONS_TYPE) {
			chatMessage = {
				id,
				sender: 'bot',
				type: 'component',
				key: MessageComponentKey.WITH_BUTTONS,
				arguments: {
					text: parsed.text,
					buttons: parsed.buttons,
					blockUserInput: parsed.blockUserInput,
				},
			};
		}
	} catch {
		// ignore error as the message might be just a string
	}

	return chatMessage;
}

export function shouldBlockUserInput(message: ChatMessage): boolean {
	if (
		message.type === 'component' &&
		message.key === MessageComponentKey.WITH_BUTTONS &&
		typeof message.arguments?.blockUserInput === 'boolean'
	) {
		return message.arguments?.blockUserInput;
	}

	return false;
}
