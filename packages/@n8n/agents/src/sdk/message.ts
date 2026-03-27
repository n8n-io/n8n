import type { AgentDbMessage, AgentMessage, Message } from '../types/sdk/message';

/**
 * Wrap an AgentMessage with a stable id. If the message already carries an id
 * (i.e. it is already an AgentDbMessage), it is returned unchanged.
 */
export function toDbMessage(message: AgentMessage): AgentDbMessage {
	if ('id' in message && typeof message.id === 'string') {
		return message as AgentDbMessage;
	}
	return { ...message, id: crypto.randomUUID() };
}

export function isLlmMessage(message: AgentMessage): message is Message {
	return message.type !== 'custom';
}

export function filterLlmMessages(messages: AgentMessage[]): Message[] {
	return messages.filter(isLlmMessage);
}
