import { filterLlmMessages } from '../../sdk/message';
import { stripHydratedFileData, type AgentDbMessage } from '../../types/sdk/message';

function stringifySafe(value: unknown): string {
	try {
		return JSON.stringify(value) ?? '';
	} catch {
		return '';
	}
}

/**
 * Model-facing text of a message: text parts plus tool names, inputs and
 * outputs. File bytes are not text tokens, so only the text around them counts.
 */
export function messageToText(message: AgentDbMessage): string {
	const modelMessage = filterLlmMessages([message])[0];
	if (!modelMessage || !Array.isArray(modelMessage.content)) return '';
	const parts: string[] = [];
	for (const content of stripHydratedFileData(modelMessage).content) {
		if (content.type === 'text') {
			parts.push(content.text);
		} else if (content.type === 'tool-call') {
			parts.push(content.toolName, stringifySafe(content.input));
			if (content.state === 'resolved') parts.push(stringifySafe(content.output));
			else if (content.state === 'rejected') parts.push(content.error);
		}
	}
	return parts.join('\n');
}
