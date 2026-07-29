import type { Agent, ModelConfig } from '@n8n/agents';
import { PROVIDER_CAPABILITIES } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

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

/** Bare model resource name from a string id or AI SDK LanguageModel (`modelId`). */
function resolveBareModelName(modelId: ModelConfig): string | undefined {
	if (typeof modelId === 'string') {
		const slashIndex = modelId.indexOf('/');
		return slashIndex > 0 ? modelId.slice(slashIndex + 1) : modelId;
	}
	if (!isRecord(modelId)) return undefined;
	return getStringProperty(modelId, 'modelId') ?? getStringProperty(modelId, 'id');
}

/** Moonshot Kimi K3 via OpenRouter (`openrouter/moonshotai/kimi-k3`, dated slugs, etc.). */
function isKimiK3Model(modelId: ModelConfig): boolean {
	const id = resolveModelIdString(modelId)?.toLowerCase() ?? '';
	const bare = resolveBareModelName(modelId)?.toLowerCase() ?? '';
	return id.includes('kimi-k3') || bare.includes('kimi-k3');
}

/**
 * Fireworks model ids — string form (`fireworks/accounts/fireworks/models/...`) or
 * Anthropic LanguageModel objects whose `modelId` is a Fireworks resource name
 * (AI service proxy always mounts `@ai-sdk/anthropic`).
 */
function isFireworksModel(modelId: ModelConfig): boolean {
	const id = resolveModelIdString(modelId)?.toLowerCase() ?? '';
	const bare = resolveBareModelName(modelId)?.toLowerCase() ?? '';
	return (
		id.startsWith('fireworks/') ||
		id.includes('accounts/fireworks/') ||
		id.includes('/fireworks/') ||
		bare.startsWith('accounts/fireworks/') ||
		bare.includes('/fireworks/')
	);
}

/** Grok 4.5 via xAI (`xai/grok-4.5`) or OpenRouter (`openrouter/x-ai/grok-4.5`). */
function isGrok45Model(modelId: ModelConfig): boolean {
	const id = resolveModelIdString(modelId)?.toLowerCase() ?? '';
	return id.includes('grok-4.5');
}

/** GLM 5.2 on Baseten (`openai/zai-org/GLM-5.2`, `openai/zai-org/GLM-5.2-Fast`, etc.). */
function isGlm52Model(modelId: ModelConfig): boolean {
	const id = resolveModelIdString(modelId)?.toLowerCase() ?? '';
	return id.includes('glm-5.2');
}

/** GPT-5.6 family via OpenAI (`openai/gpt-5.6-sol`, `openai/gpt-5.6-terra`, `openai/gpt-5.6-luna`). */
function isGpt56Model(modelId: ModelConfig): boolean {
	const id = resolveModelIdString(modelId)?.toLowerCase() ?? '';
	return id.includes('gpt-5.6');
}

export function applyAgentThinking(agent: Agent, modelId: ModelConfig): void {
	const provider = resolveModelProvider(modelId);

	if (!provider || !PROVIDER_CAPABILITIES[provider]?.thinking) return;

	if (provider === 'baseten') {
		if (isGlm52Model(modelId)) {
			// GLM 5.2 only accepts none/high/max — map our medium tier to high.
			agent.thinking('baseten', { reasoningEffort: 'high' });
			return;
		}
		agent.thinking('baseten', { reasoningEffort: 'medium' });
		return;
	}

	if (provider === 'openai') {
		if (isGlm52Model(modelId)) {
			// Legacy OpenAI-compatible Baseten routing — same GLM effort mapping.
			agent.thinking('openai', { reasoningEffort: 'high' });
			return;
		}
		if (isGpt56Model(modelId)) {
			// Pin medium for GPT-5.6 family (sol/terra/luna) via AI SDK `reasoningEffort`.
			agent.thinking('openai', { reasoningEffort: 'medium' });
			return;
		}
		agent.thinking('openai', { reasoningEffort: 'high' });
		return;
	}

	if (provider === 'anthropic') {
		// Fireworks Anthropic-compat rejects `adaptive` and `output_config.effort`
		// (proxy: "Extra inputs are not permitted"). Control depth via budget_tokens.
		// Budget must match FIREWORKS_ANTHROPIC_THINKING_BUDGET_TOKENS in @n8n/agents
		// provider-quirks (AI SDK adds it into max_tokens; proxy caps at 64k).
		if (isFireworksModel(modelId)) {
			agent.thinking('anthropic', { mode: 'enabled', budgetTokens: 8192 });
			return;
		}
		agent.thinking('anthropic', { mode: 'adaptive', effort: 'medium' });
		return;
	}

	if (provider === 'vertex') {
		// Claude on Vertex — same adaptive thinking as direct Anthropic.
		agent.thinking('vertex', { mode: 'adaptive', effort: 'medium' });
		return;
	}

	if (provider === 'fireworks') {
		agent.thinking('fireworks', { reasoningEffort: 'medium' });
		return;
	}

	if (provider === 'openrouter') {
		// Pin medium effort for models that default to heavy/max thinking.
		if (isKimiK3Model(modelId) || isGrok45Model(modelId)) {
			agent.thinking('openrouter', { reasoningEffort: 'medium' });
		}
		return;
	}

	if (provider === 'xai') {
		if (isGrok45Model(modelId)) {
			agent.thinking('xai', { reasoningEffort: 'medium' });
		}
	}
}
