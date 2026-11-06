/** Prices in USD per token. */
export interface ModelPrices {
	input?: number;
	output?: number;
	cacheRead?: number;
	cacheWrite?: number;
}

interface TokenCounts {
	inputTokens: number;
	outputTokens: number;
	cacheReadTokens?: number;
	cacheWriteTokens?: number;
}

export function priceUsage(tokens: TokenCounts, prices: ModelPrices | undefined) {
	if (prices?.input === undefined || prices.output === undefined) {
		return { estimatedCostUsd: null, priced: false };
	}

	const cacheRead = tokens.cacheReadTokens ?? 0;
	const cacheWrite = tokens.cacheWriteTokens ?? 0;
	// Input tokens include the cached ones, which have their own rates.
	const uncached = Math.max(tokens.inputTokens - cacheRead - cacheWrite, 0);
	const estimatedCostUsd =
		uncached * prices.input +
		cacheRead * (prices.cacheRead ?? prices.input) +
		cacheWrite * (prices.cacheWrite ?? prices.input) +
		tokens.outputTokens * prices.output;

	return { estimatedCostUsd, priced: true };
}
