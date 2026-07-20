import type { ProviderOptions } from '@ai-sdk/provider-utils';
import { isRecord } from '@n8n/utils/is-record';
import type { ModelMessage, SystemModelMessage, ToolSet } from 'ai';
import { createHash } from 'crypto';

import type { PromptCachingConfig } from '../../types/sdk/agent';
import type { JSONObject } from '../../types/utils/json';

/** Anthropic hard-errors past this many `cacheControl` breakpoints in one request. */
const MAX_ANTHROPIC_CACHE_BREAKPOINTS = 4;

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
function getAnthropicCacheTtl(config: PromptCachingConfig | undefined): '5m' | '1h' {
	const anthropicConfig = config?.anthropic;
	return anthropicConfig && anthropicConfig.ttl ? anthropicConfig.ttl : '1h';
}

/**
 * TTL to use for cache-write cost scaling: only defined when the model is
 * Anthropic and prompt caching is enabled for it. Manual caller markers
 * (without `.promptCaching()`) default to Anthropic's 5m write premium.
 */
export function getEffectiveAnthropicCacheTtl(
	config: PromptCachingConfig | undefined,
	modelId: string,
): '5m' | '1h' | undefined {
	if (getModelProvider(modelId) !== 'anthropic' || !isEnabledForProvider(config, 'anthropic')) {
		return undefined;
	}
	return getAnthropicCacheTtl(config);
}

function isEnabledForProvider(
	config: PromptCachingConfig | undefined,
	provider: 'anthropic' | 'openai',
): boolean {
	if (!config || config.enabled === false) return false;
	return config[provider] !== false;
}

/** Provider prefix of a `provider/model` id (e.g. `anthropic` from `anthropic/claude-...`). */
export function getModelProvider(modelId: string): string {
	return modelId.split('/')[0];
}

/**
 * Deterministic, non-reversible per-agent-version OpenAI `promptCacheKey`.
 * Hashes the agent name, model id, and base instructions together so the key
 * stays stable across runs but changes when any of them change. Never embeds
 * raw agent names, instructions, user input, thread ids, or tenant/user
 * identifiers. Fixed at 64 characters (OpenAI's max) regardless of agent name
 * length.
 */
function createOpenAIPromptCacheKey(input: {
	agentName: string;
	modelId: string;
	instructions: string;
}): string {
	const hash = createHash('sha256')
		.update(`${input.agentName}\n${input.modelId}\n${input.instructions}`)
		.digest('hex')
		.slice(0, 58);
	// Provider-neutral namespace — this is a generic SDK, not an n8n-only surface.
	return `agent:${hash}`;
}

/** `{ anthropic: { cacheControl: { type: 'ephemeral', ttl } } }` using the configured TTL. */
function buildAnthropicCacheControl(config: PromptCachingConfig | undefined): ProviderOptions {
	return {
		anthropic: { cacheControl: { type: 'ephemeral', ttl: getAnthropicCacheTtl(config) } },
	};
}

/** True when `providerOptions` carries an Anthropic `cacheControl` marker. */
function hasAnthropicCacheControl(providerOptions: ProviderOptions | undefined): boolean {
	const anthropic = providerOptions?.anthropic;
	return isRecord(anthropic) && isRecord(anthropic.cacheControl);
}

/**
 * True when `message` already carries an Anthropic `cacheControl` marker at the
 * position the runtime conversation-history breakpoint would occupy — message-level
 * (which the AI SDK applies to the last content part) or directly on the last
 * content part. Adding our marker there creates no new breakpoint, so it must not
 * be counted against the 4-breakpoint budget, and the caller's marker is left intact.
 */
function lastContentPartHasAnthropicCacheControl(message: ModelMessage): boolean {
	if (hasAnthropicCacheControl(message.providerOptions)) return true;
	if (!Array.isArray(message.content)) return false;
	const lastPart = message.content.at(-1);
	const lastPartProviderOptions =
		lastPart && 'providerOptions' in lastPart ? lastPart.providerOptions : undefined;
	return hasAnthropicCacheControl(lastPartProviderOptions);
}

/**
 * Count Anthropic `cacheControl` breakpoints already present across the system
 * message(s), tool definitions, and conversation messages (message-level and
 * per-content-part) — used to stay within Anthropic's 4-breakpoint limit before
 * adding any runtime-generated breakpoints.
 */
function countAnthropicBreakpoints(
	system: SystemModelMessage | SystemModelMessage[],
	aiTools: ToolSet,
	messages: ModelMessage[],
): number {
	let count = 0;
	const systemMessages = Array.isArray(system) ? system : [system];
	for (const msg of systemMessages) {
		if (hasAnthropicCacheControl(msg.providerOptions)) count++;
	}
	for (const tool of Object.values(aiTools)) {
		if (hasAnthropicCacheControl(tool.providerOptions)) count++;
	}
	for (const msg of messages) {
		if (hasAnthropicCacheControl(msg.providerOptions)) count++;
		if (!Array.isArray(msg.content)) continue;
		for (const part of msg.content) {
			const partProviderOptions = 'providerOptions' in part ? part.providerOptions : undefined;
			if (hasAnthropicCacheControl(partProviderOptions)) count++;
		}
	}
	return count;
}

/** Anthropic instruction-level cache breakpoint. Undefined for non-Anthropic models or when disabled. */
export function buildInstructionPromptCacheOptions(
	config: PromptCachingConfig | undefined,
	modelId: string,
): ProviderOptions | undefined {
	if (getModelProvider(modelId) !== 'anthropic' || !isEnabledForProvider(config, 'anthropic')) {
		return undefined;
	}

	return buildAnthropicCacheControl(config);
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

/**
 * Anthropic-only, opt-in runtime cache breakpoints layered on top of the static
 * instruction breakpoint:
 *  - a moving breakpoint on the last message, so agentic tool loops and
 *    multi-turn conversations read the cached prefix instead of reprocessing
 *    the whole transcript every call;
 *  - a breakpoint on `staticToolCacheName` (when the tool set is fully static),
 *    so a large stable tool block stays cached independently of the
 *    conversation prefix.
 *
 * Anthropic's `cacheControl` marker applies to the *last content part* of a
 * message, whether set directly on that part or (as done here) on the message
 * itself — the AI SDK's Anthropic converter falls back to message-level
 * `providerOptions` for the last part of system/user/assistant/tool messages.
 *
 * Both breakpoints are added only while the running total of Anthropic
 * `cacheControl` markers stays within the 4-breakpoint limit, so pre-existing
 * caller breakpoints (via `.instructions()` / `Tool.providerOptions()`) are
 * never pushed over the limit and always take priority. No-op for non-Anthropic
 * models or when prompt caching is disabled.
 */
export function applyRuntimeCacheBreakpoints(params: {
	system: SystemModelMessage | SystemModelMessage[];
	messages: ModelMessage[];
	aiTools: ToolSet;
	promptCaching: PromptCachingConfig | undefined;
	modelId: string;
	staticToolCacheName: string | undefined;
}): { messages: ModelMessage[]; aiTools: ToolSet } {
	const { system, messages, aiTools, promptCaching, modelId, staticToolCacheName } = params;
	if (
		getModelProvider(modelId) !== 'anthropic' ||
		!isEnabledForProvider(promptCaching, 'anthropic')
	) {
		return { messages, aiTools };
	}

	let used = countAnthropicBreakpoints(system, aiTools, messages);
	const cacheControl = buildAnthropicCacheControl(promptCaching);

	let nextMessages = messages;
	if (messages.length > 0 && used < MAX_ANTHROPIC_CACHE_BREAKPOINTS) {
		const lastIndex = messages.length - 1;
		const lastMessage = messages[lastIndex];
		// Skip when the last message is already marked where ours would land: it
		// already anchors the conversation prefix and is counted in `used`, so
		// re-marking would double-count the budget (wrongly suppressing the tool
		// breakpoint below) and evict the caller's marker.
		if (!lastContentPartHasAnthropicCacheControl(lastMessage)) {
			nextMessages = [...messages];
			nextMessages[lastIndex] = {
				...lastMessage,
				providerOptions: mergeProviderOptions(lastMessage.providerOptions, cacheControl),
			};
			used++;
		}
	}

	let nextTools = aiTools;
	if (staticToolCacheName && used < MAX_ANTHROPIC_CACHE_BREAKPOINTS) {
		const staticTool = aiTools[staticToolCacheName];
		// A caller marker on the static tool already anchors this breakpoint (and
		// is counted in `used`); re-marking would evict the caller's cacheControl.
		if (staticTool && !hasAnthropicCacheControl(staticTool.providerOptions)) {
			nextTools = {
				...aiTools,
				[staticToolCacheName]: {
					...staticTool,
					providerOptions: mergeProviderOptions(staticTool.providerOptions, cacheControl),
				},
			};
		}
	}

	return { messages: nextMessages, aiTools: nextTools };
}
