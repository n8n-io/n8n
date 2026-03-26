import type { AgentMessage, Message } from '../types/sdk/message';

export function getCreatedAt(message: AgentMessage): Date | null {
	if ('createdAt' in message) {
		if (message.createdAt instanceof Date) {
			return message.createdAt;
		}
		if (typeof message.createdAt === 'string' || typeof message.createdAt === 'number') {
			return new Date(message.createdAt);
		}
		throw new Error('createdAt must be a Date, string, or number');
	}
	return null;
}

export function isLlmMessage(message: AgentMessage): message is Message {
	return message.type !== 'custom';
}

export function filterLlmMessages(messages: AgentMessage[]): Message[] {
	return messages.filter(isLlmMessage);
}
