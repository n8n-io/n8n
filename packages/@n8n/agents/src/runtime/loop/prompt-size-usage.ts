import type { PromptSizeUsage, TokenUsage } from '../../types';

/**
 * Prompt sizes above which providers charge more for a model call, for example
 * Claude Haiku 5.5 above 100k tokens or Gemini 2.5 Pro above 200k. Usage is
 * split at these points so that the cost of each part can be priced correctly.
 * When a provider adds a new price threshold, add it here.
 */
export const PROMPT_SIZE_BUCKET_THRESHOLDS = [
	32_000, 64_000, 100_000, 128_000, 200_000, 256_000, 272_000, 400_000, 512_000,
] as const;

type TokenCounts = PromptSizeUsage['usage'];

/** Prompt size of one model call: all input tokens, cache reads and writes included. */
export function promptSizeOf(usage: TokenCounts): number {
	const details = usage.inputTokenDetails;
	const detailTotal =
		(details?.noCache ?? 0) + (details?.cacheRead ?? 0) + (details?.cacheWrite ?? 0);
	return Math.max(usage.promptTokens, detailTotal);
}

function bucketLowerBound(promptTokens: number): number {
	let lowerBound = 0;
	for (const threshold of PROMPT_SIZE_BUCKET_THRESHOLDS) {
		if (promptTokens > threshold) lowerBound = threshold;
	}
	return lowerBound;
}

function toTokenCounts(usage: TokenUsage): TokenCounts {
	return {
		promptTokens: usage.promptTokens,
		completionTokens: usage.completionTokens,
		totalTokens: usage.totalTokens,
		...(usage.inputTokenDetails && { inputTokenDetails: { ...usage.inputTokenDetails } }),
		...(usage.outputTokenDetails && { outputTokenDetails: { ...usage.outputTokenDetails } }),
	};
}

/**
 * Add the prompt-size split to the usage of a single model call, so that
 * `mergeUsage` keeps it when it sums the calls of a run.
 */
export function withPromptSizeBreakdown(usage: TokenUsage | undefined): TokenUsage | undefined {
	if (!usage || usage.byPromptSize) return usage;
	const counts = toTokenCounts(usage);
	const maxPromptTokens = promptSizeOf(counts);
	return {
		...usage,
		byPromptSize: [
			{ promptTokensOver: bucketLowerBound(maxPromptTokens), maxPromptTokens, usage: counts },
		],
	};
}

/** Sum the token counts of two usage values. */
export function mergeTokenCounts(current: TokenCounts, next: TokenCounts): TokenCounts {
	const merged: TokenCounts = {
		promptTokens: current.promptTokens + next.promptTokens,
		completionTokens: current.completionTokens + next.completionTokens,
		totalTokens: current.totalTokens + next.totalTokens,
	};

	const noCache =
		(current.inputTokenDetails?.noCache ?? 0) + (next.inputTokenDetails?.noCache ?? 0);
	const cacheRead =
		(current.inputTokenDetails?.cacheRead ?? 0) + (next.inputTokenDetails?.cacheRead ?? 0);
	const cacheWrite =
		(current.inputTokenDetails?.cacheWrite ?? 0) + (next.inputTokenDetails?.cacheWrite ?? 0);
	if (noCache > 0 || cacheRead > 0 || cacheWrite > 0) {
		merged.inputTokenDetails = {
			...(noCache > 0 && { noCache }),
			...(cacheRead > 0 && { cacheRead }),
			...(cacheWrite > 0 && { cacheWrite }),
		};
	}

	const reasoning =
		(current.outputTokenDetails?.reasoning ?? 0) + (next.outputTokenDetails?.reasoning ?? 0);
	if (reasoning > 0) {
		merged.outputTokenDetails = { reasoning };
	}

	return merged;
}

/**
 * Merge two prompt-size splits bucket by bucket. Returns undefined when either
 * side has no split: a partial split would leave some calls unpriced.
 */
export function mergePromptSizeUsage(
	current: PromptSizeUsage[] | undefined,
	next: PromptSizeUsage[] | undefined,
): PromptSizeUsage[] | undefined {
	if (!current || !next) return undefined;

	const byBucket = new Map<number, PromptSizeUsage>();
	for (const entry of [...current, ...next]) {
		const existing = byBucket.get(entry.promptTokensOver);
		byBucket.set(
			entry.promptTokensOver,
			existing
				? {
						promptTokensOver: entry.promptTokensOver,
						maxPromptTokens: Math.max(existing.maxPromptTokens, entry.maxPromptTokens),
						usage: mergeTokenCounts(existing.usage, entry.usage),
					}
				: entry,
		);
	}
	return [...byBucket.values()].sort((a, b) => a.promptTokensOver - b.promptTokensOver);
}
