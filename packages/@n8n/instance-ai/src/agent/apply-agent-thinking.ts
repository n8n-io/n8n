import type { Agent, ModelConfig, OpenAIReasoningEffort } from '@n8n/agents';
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
 * Fireworks model ids — string form (`fireworks/...`) or Anthropic LanguageModel
 * objects whose `modelId` contains a Fireworks resource path (AI service proxy
 * mounts `@ai-sdk/anthropic`).
 */
function isFireworksModel(modelId: ModelConfig): boolean {
	const id = resolveModelIdString(modelId)?.toLowerCase() ?? '';
	const bare = resolveBareModelName(modelId)?.toLowerCase() ?? '';
	return id.startsWith('fireworks/') || id.includes('/fireworks/') || bare.includes('/fireworks/');
}

/** Grok 4.5 via xAI (`xai/grok-4.5`) or OpenRouter (`openrouter/x-ai/grok-4.5`). */
function isGrok45Model(modelId: ModelConfig): boolean {
	const id = resolveModelIdString(modelId)?.toLowerCase() ?? '';
	return id.includes('grok-4.5');
}

/** GPT-5.6 family via OpenAI (`openai/gpt-5.6-sol`, `openai/gpt-5.6-terra`, `openai/gpt-5.6-luna`). */
function isGpt56Model(modelId: ModelConfig): boolean {
	const id = resolveModelIdString(modelId)?.toLowerCase() ?? '';
	return id.includes('gpt-5.6');
}

/** Providers that pin a fixed OpenAI-style reasoning effort for every model. */
const PROVIDER_EFFORT_PINS = {
	baseten: 'none',
	wafer: 'medium',
	morph: 'medium',
	togetherai: 'low',
	custom: 'low',
	fireworks: 'medium',
} as const satisfies Record<string, OpenAIReasoningEffort>;

type PinnedEffortProvider = keyof typeof PROVIDER_EFFORT_PINS;

function isPinnedEffortProvider(provider: string): provider is PinnedEffortProvider {
	return Object.hasOwn(PROVIDER_EFFORT_PINS, provider);
}

export function applyAgentThinking(agent: Agent, modelId: ModelConfig): void {
	const provider = resolveModelProvider(modelId);

	if (!provider || !PROVIDER_CAPABILITIES[provider]?.thinking) return;

	if (isPinnedEffortProvider(provider)) {
		agent.thinking(provider, { reasoningEffort: PROVIDER_EFFORT_PINS[provider] });
		return;
	}

	if (provider === 'openai') {
		agent.thinking('openai', {
			reasoningEffort: isGpt56Model(modelId) ? 'medium' : 'high',
		});
		return;
	}

	if (provider === 'anthropic') {
		// Fireworks Anthropic-compat rejects `adaptive` and `output_config.effort`
		// ("Extra inputs are not permitted"). Control depth via budget_tokens.
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

	if (provider === 'openrouter') {
		// Pin medium for models that default to heavy/max thinking.
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
