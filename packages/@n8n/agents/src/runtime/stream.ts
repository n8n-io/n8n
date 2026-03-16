import type { JSONValue } from '../json';
import type { FinishReason, StreamChunk, TokenUsage } from '../types';

/**
 * Shape of chunks emitted by AI SDK v6 `streamText().fullStream`.
 * Field names match AI SDK v6's TextStreamPart union type.
 */
interface AiStreamChunk {
	type: string;
	// text-delta
	text?: string;
	// reasoning-delta (also uses 'text')
	// tool-call
	toolCallId?: string;
	toolName?: string;
	input?: unknown;
	// tool-input-delta (streaming tool call arguments)
	delta?: string;
	// tool-result (only emitted when tools have execute, not in manual loops)
	output?: { type: string; value?: unknown };
	// error
	error?: unknown;
	// finish-step (per-iteration finish, has 'usage')
	finishReason?: string;
	usage?: {
		inputTokens?: number;
		outputTokens?: number;
		totalTokens?: number;
	};
	// finish (aggregate finish at end of stream, has 'totalUsage')
	totalUsage?: {
		inputTokens?: number;
		outputTokens?: number;
		totalTokens?: number;
	};
}

/** Map AI SDK v6 LanguageModelUsage to our TokenUsage type. */
export function toTokenUsage(
	usage: { inputTokens?: number; outputTokens?: number; totalTokens?: number } | undefined,
): TokenUsage | undefined {
	if (!usage) return undefined;
	return {
		promptTokens: usage.inputTokens ?? 0,
		completionTokens: usage.outputTokens ?? 0,
		totalTokens: usage.totalTokens ?? (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0),
	};
}

/** Convert a single AI SDK v6 fullStream chunk to an n8n StreamChunk (or undefined to skip). */
export function convertChunk(chunk: unknown): StreamChunk | undefined {
	const c = chunk as AiStreamChunk;

	switch (c.type) {
		case 'text-delta':
			return { type: 'text-delta', delta: c.text ?? '' };

		case 'reasoning-delta':
			return { type: 'reasoning-delta', delta: c.text ?? '' };

		case 'tool-call':
			return {
				type: 'message',
				message: {
					role: 'tool',
					content: [
						{
							type: 'tool-call',
							toolCallId: c.toolCallId,
							toolName: c.toolName ?? '',
							input: (typeof c.input === 'string'
								? c.input
								: JSON.stringify(c.input ?? {})) as JSONValue,
						},
					],
				},
			};

		case 'tool-input-start':
			return {
				type: 'tool-call-delta',
				name: c.toolName,
			};

		case 'tool-input-delta':
			return {
				type: 'tool-call-delta',
				...(c.delta !== undefined && { argumentsDelta: c.delta }),
			};

		case 'tool-result':
			return {
				type: 'message',
				message: {
					role: 'tool',
					content: [
						{
							type: 'tool-result',
							toolCallId: c.toolCallId ?? '',
							toolName: c.toolName ?? '',
							result: (c.output?.type === 'json' ? c.output.value : c.output?.value) as JSONValue,
							input: null,
						},
					],
				},
			};

		case 'error':
			return { type: 'error', error: c.error };

		case 'finish-step': {
			const usage = toTokenUsage(c.usage);
			return {
				type: 'finish',
				finishReason: (c.finishReason ?? 'stop') as FinishReason,
				...(usage && { usage }),
			};
		}

		case 'finish': {
			const usage = toTokenUsage(c.totalUsage);
			return {
				type: 'finish',
				finishReason: (c.finishReason ?? 'stop') as FinishReason,
				...(usage && { usage }),
			};
		}

		default:
			return undefined;
	}
}

/** Create a TransformStream that converts AI SDK v6 fullStream chunks to n8n StreamChunk format. */
export function createStreamTransformer(): TransformStream<unknown, StreamChunk> {
	return new TransformStream({
		transform(chunk: unknown, controller) {
			const converted = convertChunk(chunk);
			if (converted) {
				controller.enqueue(converted);
			}
		},
	});
}
