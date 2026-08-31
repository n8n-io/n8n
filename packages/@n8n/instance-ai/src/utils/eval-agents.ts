/** Shared agent factory + helpers for eval LLM calls (hint generation, mock responses, pin data). */

import { Agent, Tool, type GenerateResult, type ModelConfig } from '@n8n/agents';

import { parseModelHeadersJson } from './parse-model-headers';
import { applyAgentThinking } from '../agent/apply-agent-thinking';

export { Tool };

// ---------------------------------------------------------------------------
// Model constants
// ---------------------------------------------------------------------------

export const SONNET_MODEL = 'anthropic/claude-sonnet-4-6';
export const HAIKU_MODEL = 'anthropic/claude-haiku-4-5-20251001';

// ---------------------------------------------------------------------------
// Model config resolution
// ---------------------------------------------------------------------------

const PROVIDER_API_KEY_ENV: Record<string, string> = {
	anthropic: 'ANTHROPIC_API_KEY',
	google: 'GOOGLE_GENERATIVE_AI_API_KEY',
	openai: 'OPENAI_API_KEY',
	xai: 'XAI_API_KEY',
};

export interface EvalModelConfig {
	modelId: string;
	provider: string;
	providerModelId: string;
	apiKey: string;
	url?: string;
	headers?: Record<string, string>;
}

function getModelId(model?: string): string {
	const modelId =
		model ??
		process.env.N8N_INSTANCE_AI_EVAL_MODEL ??
		process.env.N8N_INSTANCE_AI_MODEL ??
		SONNET_MODEL;
	return modelId;
}

/**
 * True when the resolved model is the Instance AI builder model (or there is
 * no separate builder model). False when resolving a dedicated eval model
 * (N8N_INSTANCE_AI_EVAL_MODEL / explicit arg) that differs from the builder —
 * in that case we must not reuse the builder's API key or custom base URL.
 */
function isResolvingBuilderModel(modelId: string): boolean {
	const builderModel = process.env.N8N_INSTANCE_AI_MODEL?.trim();
	if (!builderModel) return true;
	return modelId === builderModel;
}

function getApiKey(modelId: string): string {
	const [provider] = modelId.split('/');
	const providerKeyEnv = PROVIDER_API_KEY_ENV[provider];
	const providerKey = providerKeyEnv ? process.env[providerKeyEnv] : undefined;
	const anthropicLegacy = provider === 'anthropic' ? process.env.N8N_AI_ANTHROPIC_KEY : undefined;
	const genericKey = process.env.N8N_INSTANCE_AI_MODEL_API_KEY;

	// Builder model: prefer the lane's N8N_INSTANCE_AI_MODEL_API_KEY.
	// Separate eval model (e.g. Anthropic mocks while builder is custom/openai):
	// prefer provider-native keys so an OpenAI/empty builder key is not sent to Anthropic.
	const key = isResolvingBuilderModel(modelId)
		? (genericKey ?? anthropicLegacy ?? providerKey)
		: (anthropicLegacy ?? providerKey ?? genericKey);

	if (!key) {
		// custom/* OpenAI-compatible routers may be keyless (URL only) or
		// header-auth (URL + headers). Both are valid without an API key.
		if (isResolvingBuilderModel(modelId) && allowsKeylessCustomEndpoint(provider)) return '';
		throw new Error(
			`Missing API key for eval model "${modelId}". Set N8N_INSTANCE_AI_MODEL_API_KEY${
				provider === 'anthropic'
					? ' or N8N_AI_ANTHROPIC_KEY or ANTHROPIC_API_KEY'
					: providerKeyEnv
						? ` or ${providerKeyEnv}`
						: ''
			} in your environment.`,
		);
	}
	return key;
}

function getModelUrl(): string | undefined {
	const url = process.env.N8N_INSTANCE_AI_MODEL_URL?.trim();
	if (!url) return undefined;
	return url;
}

function getModelHeaders(): Record<string, string> | undefined {
	return parseModelHeadersJson(process.env.EVAL_MODAL_LLM_HEADERS);
}

function allowsKeylessCustomEndpoint(provider: string): boolean {
	if (!getModelUrl()) return false;
	if (getModelHeaders()) return true;

	return provider === 'custom';
}

export function resolveEvalModelConfig(model?: string): EvalModelConfig {
	const modelId = getModelId(model);
	const [provider, ...rest] = modelId.split('/');
	const joinedProviderModelId = rest.join('/');
	let providerModelId = modelId;
	if (joinedProviderModelId.length > 0) {
		providerModelId = joinedProviderModelId;
	}
	// Builder endpoint (URL/headers) only applies when resolving that builder model.
	// A dedicated Anthropic eval model must hit Anthropic, not the custom/Foundry base.
	const attachBuilderEndpoint = isResolvingBuilderModel(modelId);
	return {
		modelId,
		provider,
		providerModelId,
		apiKey: getApiKey(modelId),
		url: attachBuilderEndpoint ? getModelUrl() : undefined,
		headers: attachBuilderEndpoint ? getModelHeaders() : undefined,
	};
}

// ---------------------------------------------------------------------------
// Agent factory
// ---------------------------------------------------------------------------

/** Anthropic `providerOptions` payload that marks the preceding block as an ephemeral cache breakpoint. */
export const EPHEMERAL_CACHE = {
	anthropic: { cacheControl: { type: 'ephemeral' as const } },
};

const CACHE_PROVIDER_OPTS = {
	providerOptions: EPHEMERAL_CACHE,
};

/**
 * Env-based tiered model when configured, otherwise the caller's fallback.
 * Deployments where the model is managed outside the environment (e.g. the
 * cloud AI service proxy) have no eval API key, so without a fallback every
 * in-product eval call would fail before reaching the LLM.
 */
function resolveAgentModel(model?: string, fallbackModelConfig?: ModelConfig): ModelConfig {
	try {
		const { modelId, apiKey, url, headers } = resolveEvalModelConfig(model);
		return {
			id: modelId,
			apiKey,
			url,
			...(headers ? { headers } : {}),
		};
	} catch (error) {
		if (fallbackModelConfig) return fallbackModelConfig;
		throw error;
	}
}

export function createEvalAgent(
	name: string,
	options: {
		model?: string;
		instructions: string;
		cache?: boolean;
		/** Host-resolved model used when no eval model API key is configured in the environment. */
		fallbackModelConfig?: ModelConfig;
	},
): Agent {
	const model = resolveAgentModel(options.model, options.fallbackModelConfig);
	const agent = new Agent(name).model(model);

	if (options.cache) {
		agent.instructions(options.instructions, CACHE_PROVIDER_OPTS);
	} else {
		agent.instructions(options.instructions);
	}

	applyAgentThinking(agent, model);

	return agent;
}

// ---------------------------------------------------------------------------
// Text extraction
// ---------------------------------------------------------------------------

export function extractText(result: GenerateResult): string {
	const texts: string[] = [];
	for (const msg of result.messages) {
		if (!('role' in msg) || msg.role !== 'assistant') continue;
		if (!('content' in msg) || !Array.isArray(msg.content)) continue;
		for (const part of msg.content) {
			if (
				typeof part === 'object' &&
				part !== null &&
				'type' in part &&
				part.type === 'text' &&
				'text' in part
			) {
				texts.push(String(part.text));
			}
		}
	}
	return texts.join('');
}
