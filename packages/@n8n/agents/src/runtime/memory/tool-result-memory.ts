import { isRecord } from '@n8n/utils/is-record';
import { toJsonValue } from '@n8n/utils/json/to-json-value';

import type { AgentDbMessage, MessageContent } from '../../types/sdk/message';
import type { JSONObject, JSONValue } from '../../types/utils/json';
import { isToolResultPath } from '../../workspace/tool-result-storage';
import { isContentToolResultOutput, type ContentToolResultOutput } from '../model/messages';

// Memory and the observer read this marker during the originating run too, so the
// message must stay true while the run can still read the stored result.
export const RUN_SCOPED_OFFLOADED_TOOL_RESULT = {
	_offloaded: true,
	runScoped: true,
	message:
		'A large tool result was stored only for its originating run. It is not available in later runs.',
} satisfies JSONObject;

type OffloadedToolResult = Record<string, unknown> & { _offloaded: true; path: string };

/** Keeps the size of the stored result so a reader knows what the run received. */
function toMemoryMarker(envelope: OffloadedToolResult): JSONObject {
	const marker: JSONObject = { ...RUN_SCOPED_OFFLOADED_TOOL_RESULT };
	for (const key of ['originalCharCount', 'estimatedTokenCount'] as const) {
		const value = envelope[key];
		if (typeof value === 'number') marker[key] = value;
	}
	return marker;
}

function isOffloadedToolResult(value: unknown): value is OffloadedToolResult {
	return (
		isRecord(value) &&
		value._offloaded === true &&
		typeof value.path === 'string' &&
		isToolResultPath(value.path)
	);
}

function parseOffloadedToolResult(value: string): OffloadedToolResult | undefined {
	try {
		const parsed: unknown = JSON.parse(value);
		return isOffloadedToolResult(parsed) ? parsed : undefined;
	} catch {
		return undefined;
	}
}

/** Returns the serialized memory marker, or undefined when `value` is not an offloaded result. */
function serializedMemoryMarker(value: string): string | undefined {
	const envelope = parseOffloadedToolResult(value);
	return envelope ? JSON.stringify(toMemoryMarker(envelope)) : undefined;
}

export function hasOffloadedToolResult(message: AgentDbMessage): boolean {
	if (!('content' in message)) return false;
	return message.content.some((block) => {
		if (block.type === 'text') return parseOffloadedToolResult(block.text) !== undefined;
		if (block.type !== 'tool-call') return false;
		if (block.state === 'rejected') return parseOffloadedToolResult(block.error) !== undefined;
		if (block.state !== 'resolved') return false;
		if (isOffloadedToolResult(block.output)) return true;
		return (
			isContentToolResultOutput(block.output) &&
			block.output.value.some(
				(part) => 'text' in part && parseOffloadedToolResult(part.text) !== undefined,
			)
		);
	});
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
			return { ...block, output: toMemoryMarker(block.output) };
		}
		if (block.state === 'resolved' && isContentToolResultOutput(block.output)) {
			return { ...block, output: sanitizeOffloadedContentResult(block.output) };
		}
		if (block.state === 'rejected') {
			const error = serializedMemoryMarker(block.error);
			if (error !== undefined) return { ...block, error };
		}
	}

	if (block.type === 'text') {
		const text = serializedMemoryMarker(block.text);
		if (text !== undefined) return { ...block, text };
	}

	return { ...block };
}

function sanitizeOffloadedContentResult(output: ContentToolResultOutput): JSONValue {
	return toJsonValue({
		type: 'content',
		value: output.value.map((part) => {
			const text = 'text' in part ? serializedMemoryMarker(part.text) : undefined;
			return text === undefined ? part : { ...part, text };
		}),
	});
}
