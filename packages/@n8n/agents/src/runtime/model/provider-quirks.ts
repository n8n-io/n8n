import type { ProviderId } from './provider-credentials';
import type {
	AnthropicThinkingConfig,
	GoogleThinkingConfig,
	JSONObject,
	OpenAIReasoningEffort,
	OpenAIThinkingConfig,
	ThinkingConfig,
	XaiThinkingConfig,
} from '../../types';

export interface ProviderQuirks {
	/**
	 * Namespace used in AI SDK `providerOptions` / `providerMetadata`.
	 * Defaults to the registry key. Vertex Anthropic still speaks the Anthropic
	 * Messages wire format, so its quirks emit under `anthropic`.
	 */
	providerOptionsNamespace?: string;
	/** providerMetadata keys on reasoning parts that must be copied to providerOptions and survive replay. */
	reasoningReplayKeys?: string[];
	/** Defaults merged under this provider's namespace into every tool's providerOptions (explicit tool values win). */
	toolProviderOptionDefaults?: JSONObject;
	/** Provider defaults to strict JSON Schema validation for structured output; relax for raw user schemas. */
	relaxStrictJsonSchemaForRawOutput?: boolean;
	/** Translate the agent's thinking config into this provider's providerOptions namespace. */
	thinkingToProviderOptions?: (
		thinking: ThinkingConfig,
		modelId: string,
	) => Record<string, Record<string, unknown>>;
}

/** Shared Anthropic Messages thinking mapping (also used by Vertex Anthropic). */
function anthropicThinkingToProviderOptions(
	thinking: ThinkingConfig,
	modelId: string,
): Record<string, Record<string, unknown>> {
	const cfg = thinking as AnthropicThinkingConfig;
	const adaptive = cfg.mode === 'adaptive' ? cfg : undefined;
	if (anthropicUsesAdaptiveThinking(modelId)) {
		return {
			anthropic: {
				thinking: { type: 'adaptive', display: adaptive?.display ?? 'summarized' },
				effort: adaptive?.effort ?? 'medium',
			},
		};
	}
	const budgetTokens = cfg.mode === 'adaptive' ? undefined : cfg.budgetTokens;
	const effort = cfg.mode === 'adaptive' ? undefined : cfg.effort;
	return {
		anthropic: {
			thinking: { type: 'enabled', budgetTokens: budgetTokens ?? 10000 },
			...(effort !== undefined ? { effort } : {}),
		},
	};
}

/** Anthropic model families that take the adaptive thinking API. */
const ANTHROPIC_ADAPTIVE_THINKING = /claude-(?:opus-(?:5|4-6|4-7|4-8)|sonnet-(?:5|4-6)|fable-5)/;
/** Anthropic model families that predate it and still take a fixed token budget. */
const ANTHROPIC_BUDGET_THINKING = /claude-(?:sonnet-4-|opus-4-|haiku-4-5|3|instant|v?2)/;

/**
 * Whether a model wants `thinking: { type: 'adaptive' }` rather than a fixed
 * budget. Mirrors the AI SDK's own classification, including its fallback of
 * treating an unrecognised `claude-` model as adaptive, so we never send a
 * thinking shape the provider it built the request for would reject.
 */
function anthropicUsesAdaptiveThinking(modelId: string): boolean {
	if (ANTHROPIC_ADAPTIVE_THINKING.test(modelId)) return true;
	if (ANTHROPIC_BUDGET_THINKING.test(modelId)) return false;
	return modelId.includes('claude-');
}

/** Map effort to top-level `reasoningEffort` (OpenAI-compatible chat). */
function reasoningEffortQuirk(
	provider: ProviderId,
	defaultEffort?: OpenAIReasoningEffort,
): ProviderQuirks {
	return {
		thinkingToProviderOptions: (thinking) => {
			const cfg = thinking as OpenAIThinkingConfig;
			const reasoningEffort = cfg.reasoningEffort ?? defaultEffort;
			if (reasoningEffort === undefined) return {};
			return { [provider]: { reasoningEffort } };
		},
	};
}

/**
 * Declarative registry of provider-specific behavior the AI SDK doesn't
 * normalize away. Each entry documents why the quirk exists and its upstream
 * status, so it reads as a removable shim rather than a mystery branch.
 */
export const PROVIDER_QUIRKS: Partial<Record<ProviderId, ProviderQuirks>> = {
	anthropic: {
		// QUIRK(anthropic): Anthropic replays thinking blocks via a `signature`
		// (or `redactedData` when the block was redacted), but the AI SDK only
		// exposes them in providerMetadata, not providerOptions. Shim until the
		// provider copies them itself on replay.
		reasoningReplayKeys: ['signature', 'redactedData'],
		// QUIRK(anthropic): defaults every function tool to eager_input_streaming,
		// which forwards the model's raw argument tokens without server-side JSON
		// validation — malformed inputs (e.g. unquoted string values) then reach
		// the runtime and burn a model retry. Opt out so Anthropic buffers and
		// validates tool arguments before emitting them; tools can still
		// explicitly re-enable it via their own providerOptions.
		toolProviderOptionDefaults: { eagerInputStreaming: false },
		// QUIRK(anthropic): the two thinking APIs are mutually exclusive — an
		// adaptive model rejects `type: 'enabled'` and vice versa — so the model
		// decides the shape and the config only fills in its details.
		thinkingToProviderOptions: anthropicThinkingToProviderOptions,
	},
	// Vertex Claude uses AnthropicLanguageModel under the hood — providerOptions
	// stay under the `anthropic` namespace even though the model id prefix differs.
	'google-vertex-anthropic': {
		providerOptionsNamespace: 'anthropic',
		toolProviderOptionDefaults: { eagerInputStreaming: false },
		thinkingToProviderOptions: anthropicThinkingToProviderOptions,
	},
	openai: {
		// QUIRK(openai): the Responses API pairs each function_call item with a
		// reasoning item; dropping the reasoning part from history makes the next
		// request fail with "function_call was provided without its required
		// 'reasoning' item" — regression fixed 2026-07-02.
		reasoningReplayKeys: ['itemId', 'reasoningEncryptedContent'],
		// QUIRK(openai): defaults to strict JSON Schema validation, which rejects
		// hand-written schemas that don't list every property in `required` or use
		// keywords it doesn't allow. See relaxStrictJsonSchemaIfNeeded's docstring
		// in runtime-context.ts for the full rationale.
		relaxStrictJsonSchemaForRawOutput: true,
		thinkingToProviderOptions: (thinking) => {
			const cfg = thinking as OpenAIThinkingConfig;
			return {
				openai: {
					reasoningEffort: cfg.reasoningEffort ?? 'medium',
					reasoningSummary: null,
				},
			};
		},
	},
	groq: {
		// QUIRK(groq): same strict-schema default as OpenAI (Groq's API follows
		// the OpenAI-compatible spec). See relaxStrictJsonSchemaIfNeeded's
		// docstring in runtime-context.ts for the full rationale.
		relaxStrictJsonSchemaForRawOutput: true,
	},
	google: {
		// Gemini's `thoughtSignature` on tool-call parts is preserved generically
		// by toAiContent's providerMetadata passthrough (messages.ts) — no
		// reasoningReplayKeys entry needed here.
		thinkingToProviderOptions: (thinking) => {
			const cfg = thinking as GoogleThinkingConfig;
			return {
				google: {
					thinkingConfig: {
						...(cfg.thinkingBudget !== undefined && { thinkingBudget: cfg.thinkingBudget }),
						...(cfg.thinkingLevel !== undefined && { thinkingLevel: cfg.thinkingLevel }),
					},
				},
			};
		},
	},
	xai: {
		thinkingToProviderOptions: (thinking) => {
			const cfg = thinking as XaiThinkingConfig;
			return { xai: { reasoningEffort: cfg.reasoningEffort ?? 'high' } };
		},
	},
	// custom/*: only forward an explicit effort — no provider-level default.
	custom: reasoningEffortQuirk('custom'),
	moonshotai: reasoningEffortQuirk('moonshotai'),
	openrouter: {
		// QUIRK(openrouter): `@openrouter/ai-sdk-provider` spreads
		// `providerOptions.openrouter` verbatim into the request body — it does
		// not translate `reasoningEffort` the way `@ai-sdk/openai-compatible`
		// does — so the effort has to use OpenRouter's unified `reasoning.effort`
		// parameter or it is silently dropped upstream.
		thinkingToProviderOptions: (thinking, modelId): Record<string, Record<string, unknown>> => {
			const cfg = thinking as OpenAIThinkingConfig;
			if (cfg.reasoningEffort === undefined) return {};
			const verbosity = openRouterAnthropicVerbosity(modelId, cfg.reasoningEffort);
			return {
				openrouter: {
					reasoning: { effort: cfg.reasoningEffort },
					...(verbosity !== undefined ? { verbosity } : {}),
				},
			};
		},
	},
};

/**
 * OpenRouter only started mapping `reasoning.effort` onto Anthropic's
 * `output_config.effort` for Claude 4.6+ on 2026-06-22; `verbosity` has
 * always mapped there and wins when both are sent. Emit it alongside so the
 * effort reaches adaptive-thinking Claude models regardless of which path
 * OpenRouter's model table has enabled. Vendor-scoped because `verbosity`
 * means output length, not effort, for non-Anthropic models.
 */
function openRouterAnthropicVerbosity(
	modelId: string,
	effort: OpenAIReasoningEffort,
): Exclude<OpenAIReasoningEffort, 'none' | 'minimal'> | undefined {
	if (!modelId.startsWith('openrouter/anthropic/')) return undefined;
	if (effort === 'none') return undefined;
	return effort === 'minimal' ? 'low' : effort;
}

export function getProviderQuirks(providerId: string): ProviderQuirks {
	return PROVIDER_QUIRKS[providerId as ProviderId] ?? {};
}

export function providerIdFromModelId(modelId: string): string {
	return modelId.split('/')[0];
}

/**
 * Default completion-token cap for reasoning-heavy Kimi K3 models.
 * Context windows are often 131072 shared input+output; requesting the full
 * window as max_tokens overflows once any prompt tokens are present.
 */
export const HIGH_REASONING_DEFAULT_MAX_OUTPUT_TOKENS = 65_536;

/**
 * Provider/model-specific default for AI SDK `maxOutputTokens`. Unknown models
 * otherwise fall back to a 4096 cap that reasoning-heavy agent turns can exhaust
 * before emitting text or tool calls.
 */
export function resolveDefaultMaxOutputTokens(modelId: string): number | undefined {
	if (modelId.toLowerCase().includes('kimi-k3')) {
		return HIGH_REASONING_DEFAULT_MAX_OUTPUT_TOKENS;
	}
	return undefined;
}

/** Merge every registered tool providerOptions default under its provider namespace; explicit tool values win. */
export function applyToolProviderOptionDefaults(
	toolProviderOptions: Record<string, JSONObject> | undefined,
): Record<string, JSONObject> {
	const result = { ...toolProviderOptions };
	for (const [provider, quirks] of Object.entries(PROVIDER_QUIRKS)) {
		if (!quirks.toolProviderOptionDefaults) continue;
		const namespace = quirks.providerOptionsNamespace ?? provider;
		result[namespace] = { ...quirks.toolProviderOptionDefaults, ...result[namespace] };
	}
	return result;
}
