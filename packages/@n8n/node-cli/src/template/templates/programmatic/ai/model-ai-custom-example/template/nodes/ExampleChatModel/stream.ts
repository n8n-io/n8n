import { parseSSEStream, type StreamChunk } from '@n8n/ai-node-sdk';

import {
	isRecord,
	isReasoningItem,
	parseJson,
	parseTokenUsage,
	responseFailedError,
	toFinishReason,
	toReasoningContent,
	toolCallId,
} from './response';
import type { OpenAIStreamEvent } from './types';

type ToolCallBuffer = { name: string; arguments: string };

function isStreamEvent(value: unknown): value is OpenAIStreamEvent {
	return isRecord(value) && typeof value.type === 'string';
}

async function* parseOpenAIStreamEvents(
	body: AsyncIterableIterator<Buffer | Uint8Array>,
): AsyncIterable<OpenAIStreamEvent> {
	for await (const message of parseSSEStream(body)) {
		const event = message.data ? parseJson(message.data) : undefined;
		if (isStreamEvent(event)) yield event;
	}
}

function* itemAdded(
	event: OpenAIStreamEvent,
	toolCallBuffers: Map<number, ToolCallBuffer>,
): Iterable<StreamChunk> {
	const item = event.item;
	if (item?.type === 'function_call') {
		toolCallBuffers.set(event.output_index ?? 0, {
			name: typeof item.name === 'string' ? item.name : '',
			arguments: typeof item.arguments === 'string' ? item.arguments : '',
		});
	}
	if (isReasoningItem(item)) {
		const reasoningText = item.summary.map((part) => part.text).join('');
		if (reasoningText) yield { type: 'reasoning-delta', delta: reasoningText };
	}
}

function* itemDone(
	event: OpenAIStreamEvent,
	toolCallBuffers: Map<number, ToolCallBuffer>,
): Iterable<StreamChunk> {
	const item = event.item;
	const buffer = toolCallBuffers.get(event.output_index ?? 0);
	if (item?.type === 'function_call' && buffer) {
		yield {
			type: 'tool-call-delta',
			id: toolCallId(item),
			name: buffer.name,
			argumentsDelta: buffer.arguments,
		};
	}
	if (isReasoningItem(item)) {
		// The complete block carries the encrypted payload for the next turn.
		yield { type: 'content', content: toReasoningContent(item) };
	}
}

export async function* toStreamChunks(
	body: AsyncIterableIterator<Buffer | Uint8Array>,
): AsyncIterable<StreamChunk> {
	const toolCallBuffers = new Map<number, ToolCallBuffer>();
	let hasToolCalls = false;

	for await (const event of parseOpenAIStreamEvents(body)) {
		switch (event.type) {
			case 'response.output_text.delta':
			case 'response.refusal.delta':
				if (event.delta) yield { type: 'text-delta', delta: event.delta };
				break;
			case 'response.reasoning_summary_text.delta':
				if (event.delta) yield { type: 'reasoning-delta', delta: event.delta };
				break;
			case 'response.output_item.added':
				yield* itemAdded(event, toolCallBuffers);
				break;
			case 'response.function_call_arguments.delta': {
				const buffer = toolCallBuffers.get(event.output_index ?? 0);
				if (buffer && event.delta) buffer.arguments += event.delta;
				break;
			}
			case 'response.output_item.done':
				for (const chunk of itemDone(event, toolCallBuffers)) {
					hasToolCalls ||= chunk.type === 'tool-call-delta';
					yield chunk;
				}
				break;
			case 'response.failed':
				throw responseFailedError(event.response);
			case 'error':
				throw new Error(`The model stream failed: ${event.message ?? 'no error details'}`);
			case 'response.done':
			case 'response.completed':
			case 'response.incomplete': {
				const status = event.type === 'response.incomplete' ? 'incomplete' : 'completed';
				yield {
					type: 'finish',
					finishReason: toFinishReason({ status, ...event.response }, hasToolCalls),
					usage: parseTokenUsage(event.response?.usage ?? event.usage),
				};
				break;
			}
			default:
				break;
		}
	}
}
