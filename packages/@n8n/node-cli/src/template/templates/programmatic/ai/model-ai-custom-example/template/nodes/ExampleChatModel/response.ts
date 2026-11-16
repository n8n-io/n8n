import { randomUUID } from 'node:crypto';
import type { FinishReason, MessageContent, TokenUsage, ToolCall } from '@n8n/ai-node-sdk';

import type { OpenAIResponsesResponse, ReasoningOutputItem, ResponsesOutputItem } from './types';

export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseJson(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		return undefined;
	}
}

function parseToolArguments(text: string): Record<string, unknown> {
	const parsed = parseJson(text);
	if (!isRecord(parsed)) {
		throw new Error(`Failed to parse function call arguments: ${text}`);
	}
	return parsed;
}

export function toolCallId({ call_id: callId, id }: { call_id?: unknown; id?: unknown }): string {
	const hasCallId = typeof callId === 'string' && callId !== '';
	const hasItemId = typeof id === 'string' && id !== '';
	switch (true) {
		case hasCallId:
			return callId;
		case !hasCallId && hasItemId:
			return id;
		default:
			// Some OpenAI-compatible servers send no ID. The generated one pairs the
			// call with its result when the conversation is sent back.
			return `call_${randomUUID()}`;
	}
}

export function parseResponsesOutput(output: ResponsesOutputItem[]): {
	text: string;
	toolCalls: ToolCall[];
} {
	let text = '';
	const toolCalls: ToolCall[] = [];

	for (const item of output) {
		if (item.type === 'message' && item.role === 'assistant') {
			for (const block of item.content) {
				if (block.type === 'output_text') {
					text += block.text;
				}
			}
		}
		if (item.type === 'function_call') {
			toolCalls.push({
				id: toolCallId(item),
				name: item.name,
				arguments: parseToolArguments(item.arguments),
				argumentsRaw: item.arguments,
			});
		}
	}

	return { text, toolCalls };
}

export function parseTokenUsage(
	usage: OpenAIResponsesResponse['usage'] | undefined,
): TokenUsage | undefined {
	return usage
		? {
				promptTokens: usage.input_tokens ?? 0,
				completionTokens: usage.output_tokens ?? 0,
				totalTokens: usage.total_tokens ?? 0,
				inputTokenDetails: {
					...(!!usage.input_tokens_details?.cached_tokens && {
						cacheRead: usage.input_tokens_details.cached_tokens,
					}),
				},
				outputTokenDetails: {
					...(!!usage.output_tokens_details?.reasoning_tokens && {
						reasoning: usage.output_tokens_details.reasoning_tokens,
					}),
				},
			}
		: undefined;
}

export function isReasoningItem(item: unknown): item is ReasoningOutputItem {
	if (!isRecord(item) || item.type !== 'reasoning') return false;
	const hasSummary =
		Array.isArray(item.summary) &&
		item.summary.every(
			(part: unknown) =>
				isRecord(part) && typeof part.type === 'string' && typeof part.text === 'string',
		);
	const payload = item.encrypted_content;
	const hasValidPayload = payload === undefined || payload === null || typeof payload === 'string';
	return hasSummary && hasValidPayload;
}

export function toReasoningContent(item: ReasoningOutputItem): MessageContent {
	const text = item.summary.map((part) => part.text).join('');
	return item.encrypted_content
		? { type: 'reasoning', text, providerMetadata: { encryptedContent: item.encrypted_content } }
		: { type: 'reasoning', text };
}

export function toFinishReason(
	response: Partial<OpenAIResponsesResponse>,
	hasToolCalls: boolean,
): FinishReason {
	const isIncomplete = response.status === 'incomplete';
	const isFiltered = response.incomplete_details?.reason === 'content_filter';
	switch (true) {
		case isIncomplete && isFiltered:
			return 'content-filter';
		case isIncomplete && !isFiltered:
			return 'length';
		case !isIncomplete && hasToolCalls:
			return 'tool-calls';
		case !isIncomplete && !hasToolCalls && response.status === 'completed':
			return 'stop';
		default:
			return 'other';
	}
}

export function responseFailedError(response: Partial<OpenAIResponsesResponse> | undefined): Error {
	return new Error(`The model response failed: ${response?.error?.message ?? 'no error details'}`);
}

export function isResponsesResponse(body: unknown): body is OpenAIResponsesResponse {
	return isRecord(body) && Array.isArray(body.output);
}
