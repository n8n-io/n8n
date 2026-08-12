import type { Agent, ModelConfig } from '@n8n/agents';
import { PROVIDER_CAPABILITIES } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

import { resolveCustomModelExperimentDefaultsFromEnv } from '../utils/custom-model-defaults';

function normalizeProvider(provider: string): string {
	return provider.split('.')[0] ?? provider;
}

function getStringProperty(value: Record<string, unknown>, key: string): string | undefined {
	const property = value[key];
	return typeof property === 'string' ? property : undefined;
}

function getProviderFromConfig(value: Record<string, unknown>): string | undefined {
	const config = value.config;
	return isRecord(config) ? getStringProperty(config, 'provider') : undefined;
}

function getProviderFromId(id: string): string | undefined {
	const slashIndex = id.indexOf('/');
	return slashIndex > 0 ? normalizeProvider(id.slice(0, slashIndex)) : undefined;
}

function resolveModelProvider(modelId: ModelConfig): string | undefined {
	if (typeof modelId === 'string') return getProviderFromId(modelId);
	if (!isRecord(modelId)) return undefined;

	const id = getStringProperty(modelId, 'id');
	if (id) return getProviderFromId(id);

	const provider = getStringProperty(modelId, 'provider') ?? getProviderFromConfig(modelId);
	const model = getStringProperty(modelId, 'modelId');
	return provider && model ? normalizeProvider(provider) : undefined;
}

function resolveModelIdString(modelId: ModelConfig): string | undefined {
	if (typeof modelId === 'string') return modelId;
	if (!isRecord(modelId)) return undefined;

	const id = getStringProperty(modelId, 'id');
	if (id) return id;

	const provider = getStringProperty(modelId, 'provider') ?? getProviderFromConfig(modelId);
	const model = getStringProperty(modelId, 'modelId');
	return provider && model ? `${provider}/${model}` : undefined;
}

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
		// No blanket custom default: env override → known-model map → omit.
		const resolvedModelId = resolveModelIdString(modelId) ?? '';
		const { reasoningEffort } = resolveCustomModelExperimentDefaultsFromEnv(resolvedModelId);
		if (reasoningEffort !== undefined) {
			agent.thinking('custom', { reasoningEffort });
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
