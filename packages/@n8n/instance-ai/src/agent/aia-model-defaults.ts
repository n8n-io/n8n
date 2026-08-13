import type { ModelConfig, PromptCachingConfig, ReasoningLevel } from '@n8n/agents';
import { PROVIDER_CAPABILITIES } from '@n8n/api-types';

import { resolveModelIdString, resolveModelProvider } from './model-config-identity';
import { resolveCustomModelExperimentDefaults } from '../utils/custom-model-defaults';

const DEFAULT_AIA_REASONING: ReasoningLevel = 'medium';
const AIA_ANTHROPIC_PROMPT_CACHING: PromptCachingConfig = { anthropic: { ttl: '5m' } };
const AIA_ENABLED_PROMPT_CACHING: PromptCachingConfig = { enabled: true };

export function resolveAIAPromptCaching(model: ModelConfig): PromptCachingConfig | undefined {
	const provider = resolveModelProvider(model);
	if (!provider) return undefined;

	const capability = PROVIDER_CAPABILITIES[provider]?.promptCaching;
	if (capability === 'ttl') return AIA_ANTHROPIC_PROMPT_CACHING;
	if (capability) return AIA_ENABLED_PROMPT_CACHING;
	return undefined;
}

export function resolveAIAReasoning(model: ModelConfig): ReasoningLevel {
	const modelId = resolveModelIdString(model) ?? '';
	// Substring map (e.g. custom/Kimi-K3) — not the exact-match proxy gate in api-types.
	const { reasoningEffort } = resolveCustomModelExperimentDefaults(modelId);
	if (reasoningEffort === 'low' || reasoningEffort === 'medium' || reasoningEffort === 'high') {
		return reasoningEffort;
	}
	return DEFAULT_AIA_REASONING;
}
