import type { TokenUsage } from '../../types/sdk/agent';
import type { TokenCounter } from '../model/model-token-counter';

/**
 * Returns a token counter for the texts that one model call wrote. The
 * provider reports the output tokens in the model's own units, so each text
 * gets a share of them by its length. The log is then measured in the same
 * units as the context window. When the provider reports no output tokens,
 * the fallback estimate is used.
 */
export function outputTokenCounter(
	output: string,
	usage: TokenUsage | undefined,
	fallback: TokenCounter,
): TokenCounter {
	const reasoning = usage?.outputTokenDetails?.reasoning ?? 0;
	const outputTokens = (usage?.completionTokens ?? 0) - reasoning;
	if (!Number.isFinite(outputTokens) || outputTokens <= 0 || output.length === 0) {
		return fallback;
	}
	const tokensPerChar = outputTokens / output.length;
	return (text) => Math.max(1, Math.round(text.length * tokensPerChar));
}
