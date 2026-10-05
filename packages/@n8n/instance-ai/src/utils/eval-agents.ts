/** Shared agent factory + helpers for eval LLM calls (hint generation, mock responses, pin data). */

import {
	Agent,
	Tool,
	type AnthropicThinkingEffort,
	type GenerateResult,
	type ModelConfig,
} from '@n8n/agents';
import { getProviderPrefix, splitModelId } from '@n8n/ai-utilities/agent-config';
import { appendFile } from 'node:fs/promises';

import { parseModelHeadersJson } from './parse-model-headers';
import { applyAgentThinking } from '../agent/apply-agent-thinking';

export { Tool };

// ---------------------------------------------------------------------------
// Model constants
// ---------------------------------------------------------------------------

export const SONNET_MODEL = 'anthropic/claude-sonnet-4-6';
export const HAIKU_MODEL = 'anthropic/claude-haiku-4-5-20251001';
export const JUDGE_MODEL = 'anthropic/claude-sonnet-5-5';
const JUDGE_EFFORT: AnthropicThinkingEffort = 'high';

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
	const provider = getProviderPrefix(modelId);
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
	const { provider, model: providerModelId } = splitModelId(modelId);
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

/** Judge-only model, so a judge A/B leaves the user proxy and the mocks on their own model. */
function judgeModelOverride(): string | undefined {
	const model = process.env.N8N_INSTANCE_AI_EVAL_JUDGE_MODEL?.trim();
	if (!model) return undefined;
	return model;
}

export function resolveJudgeModel(): string {
	return judgeModelOverride() ?? JUDGE_MODEL;
}

const EFFORTS: readonly AnthropicThinkingEffort[] = ['low', 'medium', 'high', 'xhigh', 'max'];

function effortFromEnv(name: string): AnthropicThinkingEffort | undefined {
	const value = process.env[name]?.trim();
	if (!value) return undefined;
	const effort = EFFORTS.find((candidate) => candidate === value);
	if (!effort) throw new Error(`${name} must be one of ${EFFORTS.join(', ')}; got "${value}"`);
	return effort;
}

function resolveEvalEffort(options: {
	judge?: boolean;
	model?: string;
}): AnthropicThinkingEffort | undefined {
	if (options.judge) return effortFromEnv('N8N_INSTANCE_AI_EVAL_JUDGE_EFFORT') ?? JUDGE_EFFORT;
	// A caller that pins its model (an in-product helper) keeps the standard effort.
	if (options.model !== undefined) return undefined;
	return effortFromEnv('N8N_INSTANCE_AI_EVAL_EFFORT');
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

/** Appends one JSON line per model call to `N8N_INSTANCE_AI_EVAL_USAGE_LOG`, to price eval runs. */
function logUsage(agent: Agent, name: string, effort: AnthropicThinkingEffort | undefined): void {
	const file = process.env.N8N_INSTANCE_AI_EVAL_USAGE_LOG?.trim();
	if (!file) return;

	const startedAt = new Map<string, number>();
	agent.configuration({
		onStepStart: (step) => {
			startedAt.set(`${step.callId}:${step.stepNumber}`, Date.now());
		},
		onStepEnd: async (step) => {
			const key = `${step.callId}:${step.stepNumber}`;
			const start = startedAt.get(key);
			startedAt.delete(key);
			const line = JSON.stringify({
				at: new Date().toISOString(),
				agent: name,
				model: step.model.modelId,
				effort: effort ?? 'default',
				durationMs: start === undefined ? null : Date.now() - start,
				stopReason: step.rawFinishReason ?? step.finishReason,
				inputTokens: step.usage.inputTokens,
				cacheReadTokens: step.usage.inputTokenDetails.cacheReadTokens,
				cacheWriteTokens: step.usage.inputTokenDetails.cacheWriteTokens,
				outputTokens: step.usage.outputTokens,
				reasoningTokens: step.usage.outputTokenDetails.reasoningTokens,
			});
			try {
				await appendFile(file, `${line}\n`);
			} catch {
				// Diagnostics must never fail a run.
			}
		},
	});
}

export function createEvalAgent(
	name: string,
	options: {
		model?: string;
		instructions: string;
		cache?: boolean;
		/** Host-resolved model used when no eval model API key is configured in the environment. */
		fallbackModelConfig?: ModelConfig;
		/** Use `N8N_INSTANCE_AI_EVAL_JUDGE_MODEL` / `_JUDGE_EFFORT` instead of the default eval settings. */
		judge?: boolean;
	},
): Agent {
	const model = resolveAgentModel(
		options.judge ? (judgeModelOverride() ?? options.model ?? JUDGE_MODEL) : options.model,
		options.fallbackModelConfig,
	);
	const agent = new Agent(name).model(model);

	if (options.cache) {
		agent.instructions(options.instructions, CACHE_PROVIDER_OPTS);
	} else {
		agent.instructions(options.instructions);
	}

	const effort = resolveEvalEffort(options);
	applyAgentThinking(agent, model, effort);
	logUsage(agent, name, effort);

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
