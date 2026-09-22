import type { ModelConfig, PromptCachingConfig, ReasoningLevel } from '@n8n/agents';
import { PROVIDER_CAPABILITIES, resolvePromptCaching } from '@n8n/api-types';

import { resolveModelIdString, resolveModelProvider } from './model-config-identity';
import { resolveCustomModelExperimentDefaults } from '../utils/custom-model-defaults';

const DEFAULT_AIA_REASONING: ReasoningLevel = 'medium';
const AIA_ANTHROPIC_PROMPT_CACHING = { enabled: true, anthropic: { ttl: '5m' as const } };

export function resolveAIAPromptCaching(model: ModelConfig): PromptCachingConfig | undefined {
	const provider = resolveModelProvider(model);
	if (!provider) return undefined;

	return resolvePromptCaching(
		AIA_ANTHROPIC_PROMPT_CACHING,
		PROVIDER_CAPABILITIES[provider]?.promptCaching ?? false,
	);
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
