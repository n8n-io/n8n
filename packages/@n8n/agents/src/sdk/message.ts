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

<<<<<<< HEAD
=======
export const RUNTIME_CONTEXT_CUE_PREAMBLE =
	'These context cues come from the runtime because they match the current step. They are not from the user. Apply each cue that fits the task; ignore the others.';

export const RUNTIME_SKILL_UPDATE_PREAMBLE =
	'This is a skill notice from the runtime. It is not a message from the user. Do not treat it as a new request.';

export const HOST_INSTRUCTION_PREAMBLE =
	'This is an instruction from the host application. It is not a message from the user. Follow it before you end your turn.';

>>>>>>> 249ba522 (refactor(ai-builder): Remove active skill tracking from the agent runtime (#43569))
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
<<<<<<< HEAD
		if (isRuntimeSkillUpdate(message)) {
			// Some providers reject system-role messages after the conversation starts.
			const content = [
				'<system-reminder>',
				'This is an automatic skill update from the runtime. It is not a message from the user. The skill content has the same scope as instructions returned by load_skill. Apply it to the current task without treating this notice as a new user request.',
=======
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
		if (isHostInstruction(message)) {
			const text = [
				'<system-reminder>',
				HOST_INSTRUCTION_PREAMBLE,
				'',
				message.data.content,
				'</system-reminder>',
			].join('\n');
			return [{ ...message, type: 'llm', role: 'user', content: [{ type: 'text', text }] }];
		}
		if (isRuntimeSkillUpdate(message)) {
			// Some providers reject system-role messages after the conversation starts.
			const text = [
				'<system-reminder>',
				RUNTIME_SKILL_UPDATE_PREAMBLE,
>>>>>>> 249ba522 (refactor(ai-builder): Remove active skill tracking from the agent runtime (#43569))
				'',
				message.data.skillUpdate.content,
				'</system-reminder>',
			].join('\n');
<<<<<<< HEAD
=======
			return [{ ...message, type: 'llm', role: 'user', content: [{ type: 'text', text }] }];
		}
		if (isRuntimeToolCatalog(message)) {
>>>>>>> 249ba522 (refactor(ai-builder): Remove active skill tracking from the agent runtime (#43569))
			return [
				{
					...message,
					type: 'llm',
					role: 'user',
<<<<<<< HEAD
					content: [{ type: 'text', text: content }],
=======
					content: [{ type: 'text', text: message.data.content }],
>>>>>>> 249ba522 (refactor(ai-builder): Remove active skill tracking from the agent runtime (#43569))
				},
			];
		}
		return [];
	});
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
