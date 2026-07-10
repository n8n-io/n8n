import type { ProviderId } from './provider-credentials';
import type {
	AnthropicThinkingConfig,
	GoogleThinkingConfig,
	JSONObject,
	OpenAIThinkingConfig,
	ThinkingConfig,
	XaiThinkingConfig,
} from '../../types';

export interface ProviderQuirks {
	/** providerMetadata keys on reasoning parts that must be copied to providerOptions and survive replay. */
	reasoningReplayKeys?: string[];
	/** Defaults merged under this provider's namespace into every tool's providerOptions (explicit tool values win). */
	toolProviderOptionDefaults?: JSONObject;
	/** Provider defaults to strict JSON Schema validation for structured output; relax for raw user schemas. */
	relaxStrictJsonSchemaForRawOutput?: boolean;
	/** Translate the agent's thinking config into this provider's providerOptions namespace. */
	thinkingToProviderOptions?: (thinking: ThinkingConfig) => Record<string, Record<string, unknown>>;
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
		thinkingToProviderOptions: (thinking) => {
			const cfg = thinking as AnthropicThinkingConfig;
			if (cfg.mode === 'adaptive') {
				return {
					anthropic: {
						thinking: { type: 'adaptive', display: cfg.display ?? 'summarized' },
					},
				};
			}
			return {
				anthropic: {
					thinking: { type: 'enabled', budgetTokens: cfg.budgetTokens ?? 10000 },
				},
			};
		},
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
			return { openai: { reasoningEffort: cfg.reasoningEffort ?? 'medium' } };
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
};

export function getProviderQuirks(providerId: string): ProviderQuirks {
	return PROVIDER_QUIRKS[providerId as ProviderId] ?? {};
}

export function providerIdFromModelId(modelId: string): string {
	return modelId.split('/')[0];
}

/** Merge every registered tool providerOptions default under its provider namespace; explicit tool values win. */
export function applyToolProviderOptionDefaults(
	toolProviderOptions: Record<string, JSONObject> | undefined,
): Record<string, JSONObject> {
	const result = { ...toolProviderOptions };
	for (const [provider, quirks] of Object.entries(PROVIDER_QUIRKS)) {
		if (!quirks.toolProviderOptionDefaults) continue;
		result[provider] = { ...quirks.toolProviderOptionDefaults, ...result[provider] };
	}
	return result;
}
