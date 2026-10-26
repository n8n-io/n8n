import type { AgentMessage, CustomAgentMessages, Message } from '../types/sdk/message';

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

export function isRuntimeSkillUpdate(
	message: AgentMessage,
): message is { type: 'custom'; data: CustomAgentMessages['runtimeSkillUpdate'] } {
	return (
		message.type === 'custom' &&
		'type' in message.data &&
		message.data.type === 'n8n:runtime-skill-update'
	);
}

export function filterLlmMessages(messages: AgentMessage[]): Message[] {
	return messages.flatMap((message): Message[] => {
		if (isLlmMessage(message)) return [message];
		if (isRuntimeSkillUpdate(message)) {
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
