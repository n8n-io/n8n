import { toJsonValue } from '@n8n/utils/json/to-json-value';

import type { AgentMessage, MessageContent } from '../../types/sdk/message';
import type { JSONObject, JSONValue } from '../../types/utils/json';
import { estimateObservationTokens, type TokenCounter } from '../model/model-token-counter';

export const MAX_MODEL_TOOL_RESULT_TOKENS = 50_000;
// BPE tokens cannot exceed UTF-8 bytes; reserve room for provider message framing.
const SMALL_PAYLOAD_OVERHEAD_BYTES = 1_024;

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

export async function guardToolResultForModel(
	output: unknown,
	tokenCounter: TokenCounter = estimateObservationTokens,
): Promise<GuardedToolResult> {
	const historyOutput = toJsonValue(output);
	const serialized = JSON.stringify(historyOutput);

	if (isClearlyWithinTokenLimit(serialized)) {
		return { historyOutput, wireOutput: output, truncated: false };
	}

	const tokenCount = await tokenCounter(serialized);
	if (tokenCount <= MAX_MODEL_TOOL_RESULT_TOKENS) {
		return { historyOutput, wireOutput: output, truncated: false };
	}

	const truncated = await buildTruncationEnvelope(serialized, tokenCount, tokenCounter);
	return { historyOutput: truncated, wireOutput: truncated, truncated: true };
}

export async function guardToolErrorForModel(
	errorText: string,
	tokenCounter: TokenCounter = estimateObservationTokens,
): Promise<string> {
	const guarded = await guardToolResultForModel(errorText, tokenCounter);
	return guarded.truncated ? JSON.stringify(guarded.historyOutput) : errorText;
}

export async function guardToolMessageForModel(
	message: AgentMessage,
	tokenCounter: TokenCounter = estimateObservationTokens,
): Promise<AgentMessage> {
	if (!('content' in message)) return message;

	const textBlocks = message.content.filter((block) => block.type === 'text');
	if (textBlocks.length === 0) return message;

	const serialized = JSON.stringify(textBlocks.map(({ text }) => text));
	if (isClearlyWithinTokenLimit(serialized)) return message;

	const tokenCount = await tokenCounter(serialized);
	if (tokenCount <= MAX_MODEL_TOOL_RESULT_TOKENS) return message;

	const replacement = JSON.stringify(
		await buildTruncationEnvelope(serialized, tokenCount, tokenCounter),
	);
	let replacedText = false;
	const content = message.content.flatMap((block): MessageContent[] => {
		if (block.type !== 'text') return [block];
		if (replacedText) return [];

		replacedText = true;
		return [{ ...block, text: replacement }];
	});

	return { ...message, content };
}

function isClearlyWithinTokenLimit(serialized: string): boolean {
	return (
		Buffer.byteLength(serialized, 'utf8') + SMALL_PAYLOAD_OVERHEAD_BYTES <=
		MAX_MODEL_TOOL_RESULT_TOKENS
	);
}

async function buildTruncationEnvelope(
	serialized: string,
	originalTokenCount: number,
	tokenCounter: TokenCounter,
): Promise<TruncatedToolResult> {
	const base = {
		_truncated: true,
		originalCharCount: serialized.length,
		estimatedTokenCount: originalTokenCount,
	} as const;
	let excerptLength = Math.floor(
		(serialized.length * MAX_MODEL_TOOL_RESULT_TOKENS * 0.9) / originalTokenCount,
	);

	while (true) {
		const { head, tail } = splitHeadAndTail(serialized, excerptLength);
		const candidate: TruncatedToolResult = { ...base, head, tail };
		const candidateTokenCount = await tokenCounter(JSON.stringify(candidate));
		if (candidateTokenCount <= MAX_MODEL_TOOL_RESULT_TOKENS || excerptLength === 0) {
			return candidate;
		}

		excerptLength = Math.min(
			excerptLength - 1,
			Math.floor((excerptLength * MAX_MODEL_TOOL_RESULT_TOKENS * 0.9) / candidateTokenCount),
		);
	}
}

function splitHeadAndTail(value: string, excerptLength: number): { head: string; tail: string } {
	const headLength = Math.ceil(excerptLength / 2);
	const tailLength = Math.floor(excerptLength / 2);
	return {
		head: value.slice(0, headLength),
		tail: tailLength === 0 ? '' : value.slice(-tailLength),
	};
}
