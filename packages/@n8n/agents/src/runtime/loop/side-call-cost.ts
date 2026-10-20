import { computeCost, getModelCost } from '../../sdk/catalog';
import type { PromptCachingConfig, TokenUsage } from '../../types/sdk/agent';
import { getEffectiveAnthropicCacheTtl } from '../model/prompt-cache';

/**
 * Compute the estimated USD cost of a side-call model turn (title
 * generation, observation-log observer/reflector, episodic-memory model
 * call) from models.dev pricing. Returns `undefined` when the catalog is
 * unavailable or the model has no pricing, so callers can skip the increment
 * instead of billing zero. `promptCaching` only affects Anthropic cache-write
 * pricing; it is a no-op for non-Anthropic side-call models.
 */
export async function computeSideCallCost(
	modelId: string,
	usage: TokenUsage,
	promptCaching?: PromptCachingConfig,
): Promise<number | undefined> {
	const modelCost = await getModelCost(modelId);
	if (!modelCost) return undefined;
	return computeCost(usage, modelCost, {
		anthropicCacheTtl: getEffectiveAnthropicCacheTtl(promptCaching, modelId),
	});
}

/**
 * A cost-bearing usage record for a billed call that reported no token
 * counts. The gateway bills real USD whether or not the proxied provider
 * returned usage, so the spend ledger still records the amount.
 */
export function costOnlyUsage(costUsd: number): TokenUsage {
	return { promptTokens: 0, completionTokens: 0, totalTokens: 0, cost: costUsd };
}
