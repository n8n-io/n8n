import { v4 as uuid } from 'uuid';

import { MessageComponentKey } from '../constants';
import type { ChatMessage } from '../types';

const CHAT_NODE_MESSAGE_TYPE = 'message';
const CHAT_NODE_MESSAGE_WITH_BUTTONS_TYPE = 'with-buttons';
const CHAT_NODE_ERROR_TYPE = 'error';

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

interface ChatNodeMessageRegular {
	type: typeof CHAT_NODE_MESSAGE_TYPE;
	text: string;
}

interface ChatNodeError {
	type: typeof CHAT_NODE_ERROR_TYPE;
	message: string;
}

type ChatNodeFrame = ChatNodeMessageWithButtons | ChatNodeMessageRegular | ChatNodeError;

export function constructChatWebsocketUrl(
	url: string,
	executionId: string,
	sessionId: string,
	isPublic: boolean,
	token?: string,
) {
	const baseUrl = new URL(url).origin;
	const wsProtocol = baseUrl.startsWith('https') ? 'wss' : 'ws';
	const wsUrl = baseUrl.replace(/^https?/, wsProtocol);
	let wsFullUrl = `${wsUrl}/chat?sessionId=${sessionId}&executionId=${executionId}`;
	if (isPublic) wsFullUrl += '&isPublic=true';
	if (token) wsFullUrl += `&token=${token}`;
	return wsFullUrl;
}

export function parseBotChatMessageContent(message: string): ChatMessage {
	const id = uuid();
	let chatMessage: ChatMessage = {
		id,
		sender: 'bot',
		text: message,
	};
	try {
		const parsed = JSON.parse(message) as ChatNodeFrame;
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
		} else if (parsed.type === CHAT_NODE_MESSAGE_TYPE) {
			chatMessage = { id, sender: 'bot', text: parsed.text };
		} else if (parsed.type === CHAT_NODE_ERROR_TYPE) {
			chatMessage = { id, sender: 'bot', text: parsed.message };
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
