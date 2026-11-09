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

export const RUNTIME_CONTEXT_CUE_PREAMBLE =
	'These context cues come from the runtime because they match the current step. They are not from the user. Apply each cue that fits the task; ignore the others.';

export function filterLlmMessages(messages: AgentMessage[]): Message[] {
	return messages.flatMap((message): Message[] => {
		if (isLlmMessage(message)) return [message];
		if (isRuntimeSkillCatalog(message)) {
			return [
				{
					...message,
					type: 'llm',
					role: 'user',
					content: [
						{
							type: 'text',
							text: `<system-reminder>\n${message.data.content}\n</system-reminder>`,
						},
					],
				},
			];
		}
		if (isRuntimeContextCue(message)) {
			const text = [
				'<system-reminder>',
				RUNTIME_CONTEXT_CUE_PREAMBLE,
				'',
				message.data.content,
				'</system-reminder>',
			].join('\n');
			return [{ ...message, type: 'llm', role: 'user', content: [{ type: 'text', text }] }];
		}
		if (isRuntimeSkillUpdate(message)) {
			// Some providers reject system-role messages after the conversation starts.
			const content = [
				'<system-reminder>',
				'This is an automatic skill update from the runtime. It is not a message from the user. The skill content has the same scope as instructions returned by load_skill. Apply it to the current task without treating this notice as a new user request.',
				'',
				message.data.skillUpdate.content,
				'</system-reminder>',
			].join('\n');
			return [
				{
					...message,
					type: 'llm',
					role: 'user',
					content: [{ type: 'text', text: content }],
				},
			];
		}
		return [];
	});
}

export function isRuntimeContextCue<T extends AgentMessage>(
	message: T,
): message is T & { type: 'custom'; data: CustomAgentMessages['runtimeContextCue'] } {
	return (
		message.type === 'custom' &&
		'type' in message.data &&
		message.data.type === 'n8n:runtime-context-cue'
	);
}

export function isRuntimeSkillCatalog<T extends AgentMessage>(
	message: T,
): message is T & { type: 'custom'; data: CustomAgentMessages['runtimeSkillCatalog'] } {
	return (
		message.type === 'custom' &&
		'type' in message.data &&
		message.data.type === 'n8n:runtime-skill-catalog'
	);
}
