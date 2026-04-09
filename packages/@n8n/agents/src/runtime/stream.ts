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

/** Convert a single AI SDK v6 fullStream chunk to an n8n StreamChunk (or undefined to skip). */
export function convertChunk(c: TextStreamPart<ToolSet>): StreamChunk | undefined {
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
							input: c.input as JSONValue,
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
							// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
							result: c.output && 'value' in c.output ? (c.output.value as JSONValue) : null,
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
