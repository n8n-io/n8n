import type { TextStreamPart, ToolSet } from 'ai';

import type { FinishReason, StreamChunk, TokenUsage } from '../types';
import type { JSONValue } from '../types/utils/json';

/** Map AI SDK v6 LanguageModelUsage to our TokenUsage type. */
export function toTokenUsage(
	usage:
		| {
				inputTokens?: number;
				outputTokens?: number;
				totalTokens?: number;
				inputTokenDetails?: { cacheReadTokens?: number; cacheWriteTokens?: number };
				outputTokenDetails?: { reasoningTokens?: number };
		  }
		| undefined,
): TokenUsage | undefined {
	if (!usage) return undefined;

	const result: TokenUsage = {
		promptTokens: usage.inputTokens ?? 0,
		completionTokens: usage.outputTokens ?? 0,
		totalTokens: usage.totalTokens ?? (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0),
	};

	const cacheRead = usage.inputTokenDetails?.cacheReadTokens;
	const cacheWrite = usage.inputTokenDetails?.cacheWriteTokens;
	if (cacheRead || cacheWrite) {
		result.inputTokenDetails = {
			...(cacheRead && { cacheRead }),
			...(cacheWrite && { cacheWrite }),
		};
	}

	if (usage.outputTokenDetails?.reasoningTokens !== undefined) {
		result.outputTokenDetails = { reasoning: usage.outputTokenDetails.reasoningTokens };
	}

	return result;
}

/**
 * Convert a single AI SDK v6 fullStream chunk to an n8n StreamChunk
 */
export function convertChunk(c: TextStreamPart<ToolSet>): StreamChunk | undefined {
	switch (c.type) {
		case 'start-step':
			return { type: 'start-step' };

		case 'finish-step':
			return { type: 'finish-step' };

		case 'text-start':
			return { type: 'text-start', id: c.id };

		case 'text-delta':
			return { type: 'text-delta', id: c.id, delta: c.text ?? '' };

		case 'text-end':
			return { type: 'text-end', id: c.id };

		case 'reasoning-start':
			return { type: 'reasoning-start', id: c.id };

		case 'reasoning-delta':
			return { type: 'reasoning-delta', id: c.id, delta: c.text ?? '' };

		case 'reasoning-end':
			return { type: 'reasoning-end', id: c.id };

		case 'tool-input-start':
			// AI SDK uses `id` to carry the toolCallId on tool-input-* chunks.
			return { type: 'tool-input-start', toolCallId: c.id, toolName: c.toolName };

		case 'tool-input-delta':
			return { type: 'tool-input-delta', toolCallId: c.id, delta: c.delta };

		case 'tool-call': {
			if (c.invalid || c.error) {
				// usually tool results are sent from agent-runtime
				// AI SDK handles input parsing and may include errored tool result before runtime gets to process it
				return {
					type: 'tool-result',
					toolCallId: c.toolCallId,
					toolName: c.toolName ?? '',
					output: c.error,
					isError: true,
				};
			}
			return {
				type: 'tool-call',
				toolCallId: c.toolCallId,
				toolName: c.toolName ?? '',
				input: c.input as JSONValue,
			};
		}

		case 'tool-result':
			// The fullStream emits the raw tool output here, not the
			// `{ type, value }` ToolResultOutput wrapper used on the message
			// side — so pass it through verbatim. Only provider-executed tools
			// (e.g. native web search) reach this branch; local tool results are
			// written directly by the runtime and never pass through convertChunk.
			return {
				type: 'tool-result',
				toolCallId: c.toolCallId ?? '',
				toolName: c.toolName ?? '',
				output: c.output,
			};

		case 'tool-error':
			// Provider-executed tools (e.g. native web search) surface failures
			// as `tool-error` rather than `tool-result`. Map to our tool-result
			// shape so stream consumers receive the error payload.
			return {
				type: 'tool-result',
				toolCallId: c.toolCallId ?? '',
				toolName: c.toolName ?? '',
				output: c.error,
				isError: true,
			};

		case 'error':
			return { type: 'error', error: c.error };

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
