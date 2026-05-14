import type { LanguageModelV3GenerateResult } from '@ai-sdk/provider';
import { MockLanguageModelV3 } from 'ai/test';

export interface ScriptedToolCall {
	toolCallId: string;
	toolName: string;
	input: unknown;
}

/**
 * Build a `LanguageModelV3GenerateResult`-shaped response containing one or
 * more tool calls. `finishReason` is the V3 object shape
 * `{ unified, raw }` — NOT the legacy bare string.
 */
export function toolCallsResponse(calls: ScriptedToolCall[]): LanguageModelV3GenerateResult {
	return {
		content: calls.map((c) => ({
			type: 'tool-call',
			toolCallId: c.toolCallId,
			toolName: c.toolName,
			input: JSON.stringify(c.input),
		})),
		finishReason: { unified: 'tool-calls', raw: 'tool-calls' },
		usage: {
			inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
			outputTokens: { total: 5, text: 5, reasoning: 0 },
		},
		warnings: [],
	};
}

export function textResponse(text: string): LanguageModelV3GenerateResult {
	return {
		content: [{ type: 'text', text }],
		finishReason: { unified: 'stop', raw: 'stop' },
		usage: {
			inputTokens: { total: 5, noCache: 5, cacheRead: 0, cacheWrite: 0 },
			outputTokens: { total: 5, text: 5, reasoning: 0 },
		},
		warnings: [],
	};
}

export function buildScriptedModel(
	responses: LanguageModelV3GenerateResult[],
): MockLanguageModelV3 {
	let i = 0;
	return new MockLanguageModelV3({
		provider: 'mock',
		modelId: 'mock-model',
		doGenerate: async () => {
			if (i >= responses.length) {
				return textResponse('done');
			}
			const r = responses[i];
			i += 1;
			return r;
		},
	});
}
