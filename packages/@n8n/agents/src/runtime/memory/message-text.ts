import { isRecord } from '@n8n/utils/is-record';

import { filterLlmMessages } from '../../sdk/message';
import { stripHydratedFileData, type AgentDbMessage } from '../../types/sdk/message';

/** Drop inline file bytes: base64 in a tool output is not model-facing text. */
function omitFileData(_key: string, value: unknown): unknown {
	if (isRecord(value) && value.type === 'file' && 'data' in value) {
		const { data: _data, ...rest } = value;
		return rest;
	}
	return value;
}

function stringifySafe(value: unknown): string {
	try {
		return JSON.stringify(value, omitFileData) ?? '';
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
