import type { AgentMessage, Message } from '../types/sdk/message';

export function getCreatedAt(message: AgentMessage): Date | null {
	if ('createdAt' in message) {
		if (message.createdAt instanceof Date) {
			return message.createdAt;
		}
		if (typeof message.createdAt === 'string' || typeof message.createdAt === 'number') {
			const date = new Date(message.createdAt);
			if (isNaN(date.getTime())) {
				return null;
			}
			return date;
		}
	}
	return null;
}

export function isLlmMessage(message: AgentMessage): message is Message {
	return message.type !== 'custom';
}

export function filterLlmMessages(messages: AgentMessage[]): Message[] {
	return messages.flatMap((message): Message[] => {
		if (isLlmMessage(message)) return [message];
		if ('skillUpdate' in message.data) {
			return [
				{
					...message,
					type: 'llm',
					role: 'user',
					content: [{ type: 'text', text: message.data.skillUpdate.content }],
				},
			];
		}
		return [];
	});
}
