import { resolvePromptCaching } from '@n8n/api-types';

import type { AgentJsonConfig } from '../types';

type ConfigObj = NonNullable<AgentJsonConfig['config']>;

/**
 * Prompt caching is opt-out for supported providers (OpenAI/Anthropic): keep
 * an explicit `{ enabled: false }` across a provider switch (never silently
 * re-enable it), default to `{ enabled: true }` for a newly selected
 * supported provider, and strip the field entirely when the newly selected
 * provider doesn't support it.
 *
 * `currentSubConfig` should be the agent's `config.config`, already merged
 * with any other in-flight normalization (e.g. web search) for the same
 * model change, so this composes without one normalizer clobbering another.
 */
export function normalizePromptCachingForModelChange(
	currentSubConfig: ConfigObj | undefined,
	nextProviderSupportsPromptCaching: boolean,
): Partial<AgentJsonConfig> {
	const current = currentSubConfig?.promptCaching;
	const resolved = resolvePromptCaching(current, nextProviderSupportsPromptCaching);

	if (!resolved) {
		if (!current) return {};
		const { promptCaching: _promptCaching, ...restConfig } = currentSubConfig ?? {};
		// Clear with `undefined` (not `{}`) when nothing else remains so the parent's
		// Object.assign merge drops the key, matching the backend normalizer.
		return { config: Object.keys(restConfig).length > 0 ? restConfig : undefined };
	}

	return {
		config: {
			...(currentSubConfig ?? {}),
			promptCaching: resolved,
		},
	};
}
