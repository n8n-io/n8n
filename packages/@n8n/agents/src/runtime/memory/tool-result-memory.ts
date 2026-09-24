import { isRecord } from '@n8n/utils/is-record';
import { toJsonValue } from '@n8n/utils/json/to-json-value';

import type { AgentDbMessage, MessageContent } from '../../types/sdk/message';
import type { JSONObject, JSONValue } from '../../types/utils/json';
import { isToolResultPath } from '../../workspace/tool-result-storage';
import { isContentToolResultOutput, type ContentToolResultOutput } from '../model/messages';

export const EXPIRED_OFFLOADED_TOOL_RESULT = {
	_offloaded: true,
	expired: true,
	message: 'The stored tool result expired with its originating run.',
} satisfies JSONObject;

const EXPIRED_OFFLOADED_TOOL_RESULT_JSON = JSON.stringify(EXPIRED_OFFLOADED_TOOL_RESULT);

function isOffloadedToolResult(value: unknown): boolean {
	return (
		isRecord(value) &&
		value._offloaded === true &&
		typeof value.path === 'string' &&
		isToolResultPath(value.path)
	);
}

function isSerializedOffloadedToolResult(value: string): boolean {
	try {
		const parsed: unknown = JSON.parse(value);
		return isOffloadedToolResult(parsed);
	} catch {
		return false;
	}
}

export function sanitizeOffloadedToolResultsForMemory(
	messages: AgentDbMessage[],
): AgentDbMessage[] {
	return messages.map((message) => {
		if (!('content' in message)) return { ...message };

		const content = message.content.map(sanitizeOffloadedContentBlock);
		return { ...message, content };
	});
}

function sanitizeOffloadedContentBlock(block: MessageContent): MessageContent {
	if (block.type === 'tool-call') {
		if (block.state === 'resolved' && isOffloadedToolResult(block.output)) {
			return { ...block, output: { ...EXPIRED_OFFLOADED_TOOL_RESULT } };
		}
		if (block.state === 'resolved' && isContentToolResultOutput(block.output)) {
			return { ...block, output: sanitizeOffloadedContentResult(block.output) };
		}
		if (block.state === 'rejected' && isSerializedOffloadedToolResult(block.error)) {
			return { ...block, error: EXPIRED_OFFLOADED_TOOL_RESULT_JSON };
		}
	}

	if (block.type === 'text' && isSerializedOffloadedToolResult(block.text)) {
		return { ...block, text: EXPIRED_OFFLOADED_TOOL_RESULT_JSON };
	}

	return { ...block };
}

function sanitizeOffloadedContentResult(output: ContentToolResultOutput): JSONValue {
	return toJsonValue({
		type: 'content',
		value: output.value.map((part) => {
			if (part.type !== 'text' || !isSerializedOffloadedToolResult(part.text)) return part;
			return { ...part, text: EXPIRED_OFFLOADED_TOOL_RESULT_JSON };
		}),
	});
}
