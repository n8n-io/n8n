import type { ProviderOptions } from '@ai-sdk/provider-utils';
import { createHash } from 'crypto';

import type { PromptCachingConfig } from '../../types/sdk/agent';
import type { JSONObject } from '../../types/utils/json';

/** Shallow-merge provider-specific keys across provider option objects. Later objects win per key. */
export function mergeProviderOptions(
	...options: Array<ProviderOptions | undefined>
): ProviderOptions | undefined {
	const defined = options.filter((o): o is ProviderOptions => o !== undefined);
	if (defined.length === 0) return undefined;

	const merged: Record<string, JSONObject> = {};
	for (const opts of defined) {
		for (const [provider, providerOpts] of Object.entries(opts)) {
			merged[provider] = { ...merged[provider], ...providerOpts };
		}
	}
	return merged;
}

/** Resolve the effective Anthropic cache TTL from config. Defaults to `'1h'`. */
export function getAnthropicCacheTtl(config: PromptCachingConfig | undefined): '5m' | '1h' {
	const anthropicConfig = config?.anthropic;
	return anthropicConfig && anthropicConfig.ttl ? anthropicConfig.ttl : '1h';
}

function isEnabledForProvider(
	config: PromptCachingConfig | undefined,
	provider: 'anthropic' | 'openai',
): boolean {
	if (!config || config.enabled === false) return false;
	return config[provider] !== false;
}

function getModelProvider(modelId: string): string {
	return modelId.split('/')[0];
}

/**
 * Deterministic, non-reversible per-agent-version OpenAI `promptCacheKey`.
 * Combines agent name with a hash of the model id and base instructions so
 * the key stays stable across runs but changes when the "version" (model or
 * instructions) changes. Never embeds raw instructions, user input, thread
 * ids, or tenant/user identifiers.
 */
export function createOpenAIPromptCacheKey(input: {
	agentName: string;
	modelId: string;
	instructions: string;
}): string {
	const hash = createHash('sha256')
		.update(`${input.modelId}\n${input.instructions}`)
		.digest('hex')
		.slice(0, 16);
	return `n8n-agent:${input.agentName}:${hash}`;
}

/** Anthropic instruction-level cache breakpoint. Undefined for non-Anthropic models or when disabled. */
export function buildInstructionPromptCacheOptions(
	config: PromptCachingConfig | undefined,
	modelId: string,
): ProviderOptions | undefined {
	if (getModelProvider(modelId) !== 'anthropic' || !isEnabledForProvider(config, 'anthropic')) {
		return undefined;
	}

	return {
		anthropic: { cacheControl: { type: 'ephemeral', ttl: getAnthropicCacheTtl(config) } },
	};
}

/** OpenAI call-level cache options (routing key + retention). Undefined for non-OpenAI models or when disabled. */
export function buildCallPromptCacheOptions(
	config: PromptCachingConfig | undefined,
	modelId: string,
	context: { agentName: string; instructions: string },
): ProviderOptions | undefined {
	if (getModelProvider(modelId) !== 'openai' || !isEnabledForProvider(config, 'openai')) {
		return undefined;
	}

	const openaiConfig = typeof config?.openai === 'object' ? config.openai : undefined;
	return {
		openai: {
			promptCacheKey:
				openaiConfig?.promptCacheKey ?? createOpenAIPromptCacheKey({ ...context, modelId }),
			promptCacheRetention: openaiConfig?.promptCacheRetention ?? '24h',
		},
	};
}
