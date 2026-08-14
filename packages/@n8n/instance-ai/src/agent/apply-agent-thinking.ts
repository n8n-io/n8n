import type { Agent, ModelConfig } from '@n8n/agents';
import { PROVIDER_CAPABILITIES } from '@n8n/api-types';

import { resolveModelIdString, resolveModelProvider } from './model-config-identity';
import { resolveCustomModelExperimentDefaultsFromEnv } from '../utils/custom-model-defaults';

/** Grok 4.5 via xAI (`xai/grok-4.5`). */
function isGrok45Model(modelId: ModelConfig): boolean {
	const id = resolveModelIdString(modelId)?.toLowerCase() ?? '';
	return id.includes('grok-4.5');
}

/** GPT-5.6 family via OpenAI (`openai/gpt-5.6-sol`, `openai/gpt-5.6-terra`, `openai/gpt-5.6-luna`). */
function isGpt56Model(modelId: ModelConfig): boolean {
	const id = resolveModelIdString(modelId)?.toLowerCase() ?? '';
	return id.includes('gpt-5.6');
}

export function applyAgentThinking(agent: Agent, modelId: ModelConfig): void {
	const provider = resolveModelProvider(modelId);

	if (!provider || !PROVIDER_CAPABILITIES[provider]?.thinking) return;

	if (provider === 'custom') {
		// No blanket default: env override → known-model map → omit.
		const resolvedModelId = resolveModelIdString(modelId) ?? '';
		const { reasoningEffort } = resolveCustomModelExperimentDefaultsFromEnv(resolvedModelId);
		if (reasoningEffort !== undefined) {
			agent.thinking('custom', { reasoningEffort });
		}
		return;
	}

	if (provider === 'moonshotai') {
		const resolvedModelId = resolveModelIdString(modelId) ?? '';
		const { reasoningEffort } = resolveCustomModelExperimentDefaultsFromEnv(resolvedModelId);

		if (reasoningEffort !== undefined) {
			agent.thinking('moonshotai', { reasoningEffort });
		}
		return;
	}

	if (provider === 'openai') {
		agent.thinking('openai', {
			reasoningEffort: isGpt56Model(modelId) ? 'medium' : 'high',
		});
		return;
	}

	if (provider === 'anthropic' || provider === 'google-vertex-anthropic') {
		agent.thinking(provider, { mode: 'adaptive', effort: 'medium' });
		return;
	}

	if (provider === 'xai') {
		if (isGrok45Model(modelId)) {
			agent.thinking('xai', { reasoningEffort: 'medium' });
		}
	}
}
