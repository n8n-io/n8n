import { type AgentMessage, isLlmMessage } from '../message';

export const extractProviderToolResult = (messages: AgentMessage[], toolCallId: string) => {
	for (const m of messages) {
		if (isLlmMessage(m) && (m.role === 'assistant' || m.role === 'tool')) {
			for (const part of m.content) {
				if (part.type === 'tool-result' && part.toolCallId === toolCallId) {
					return part.result;
				}
			}
		}
	}
	return undefined;
};
