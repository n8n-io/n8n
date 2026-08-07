import { toJsonValue } from '@n8n/utils/json/to-json-value';

import type { AgentMessage, MessageContent } from '../../types/sdk/message';
import { estimateObservationTokens } from '../../types/sdk/observation-log';
import type { JSONObject, JSONValue } from '../../types/utils/json';

export const MAX_MODEL_TOOL_RESULT_TOKENS = 50_000;
export const MAX_MODEL_TOOL_RESULT_CHARS = MAX_MODEL_TOOL_RESULT_TOKENS * 4;

interface TruncatedToolResult extends JSONObject {
	_truncated: true;
	originalCharCount: number;
	estimatedTokenCount: number;
	head: string;
	tail: string;
}

export interface GuardedToolResult {
	historyOutput: JSONValue;
	wireOutput: unknown;
	truncated: boolean;
}

export function guardToolResultForModel(output: unknown): GuardedToolResult {
	const historyOutput = toJsonValue(output);
	const serialized = JSON.stringify(historyOutput);

	if (estimateObservationTokens(serialized) <= MAX_MODEL_TOOL_RESULT_TOKENS) {
		return { historyOutput, wireOutput: output, truncated: false };
	}

	const truncated = buildTruncationEnvelope(serialized);
	return { historyOutput: truncated, wireOutput: truncated, truncated: true };
}

export function guardToolErrorForModel(errorText: string): string {
	const guarded = guardToolResultForModel(errorText);
	return guarded.truncated ? JSON.stringify(guarded.historyOutput) : errorText;
}

export function guardToolMessageForModel(message: AgentMessage): AgentMessage {
	if (!('content' in message)) return message;

	const textBlocks = message.content.filter((block) => block.type === 'text');
	if (textBlocks.length === 0) return message;

	const serialized = JSON.stringify(textBlocks.map(({ text }) => text));
	if (estimateObservationTokens(serialized) <= MAX_MODEL_TOOL_RESULT_TOKENS) return message;

	const replacement = JSON.stringify(buildTruncationEnvelope(serialized));
	let replacedText = false;
	const content = message.content.flatMap((block): MessageContent[] => {
		if (block.type !== 'text') return [block];
		if (replacedText) return [];

		replacedText = true;
		return [{ ...block, text: replacement }];
	});

	return { ...message, content };
}

function buildTruncationEnvelope(serialized: string): TruncatedToolResult {
	const base = {
		_truncated: true,
		originalCharCount: serialized.length,
		estimatedTokenCount: estimateObservationTokens(serialized),
	} as const;
	let low = 0;
	let high = Math.min(serialized.length, MAX_MODEL_TOOL_RESULT_CHARS);
	let best: TruncatedToolResult = { ...base, head: '', tail: '' };

	while (low <= high) {
		const excerptLength = Math.floor((low + high) / 2);
		const { head, tail } = splitHeadAndTail(serialized, excerptLength);
		const candidate: TruncatedToolResult = { ...base, head, tail };

		if (JSON.stringify(candidate).length <= MAX_MODEL_TOOL_RESULT_CHARS) {
			best = candidate;
			low = excerptLength + 1;
		} else {
			high = excerptLength - 1;
		}
	}

	return best;
}
function splitHeadAndTail(value: string, excerptLength: number): { head: string; tail: string } {
	const headLength = Math.ceil(excerptLength / 2);
	const tailLength = Math.floor(excerptLength / 2);
	return {
		head: value.slice(0, headLength),
		tail: tailLength === 0 ? '' : value.slice(-tailLength),
	};
}
