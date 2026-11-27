// ---------------------------------------------------------------------------
// Model fallback tables for the own-model resolver (model-resolver.ts).
//
// Checked-in data, not logic: edit these when a provider renames a vendor on
// OpenRouter or a newer model should stand in for a tier.
// ---------------------------------------------------------------------------

import type { AgentModelProvider } from '@n8n/api-types';

/** Providers whose model names are the vendor's own ids, by OpenRouter vendor slug. */
export const OPENROUTER_VENDOR_BY_PROVIDER: Partial<Record<AgentModelProvider, string>> = {
	openai: 'openai',
	anthropic: 'anthropic',
	google: 'google',
	'google-vertex': 'google',
	xai: 'x-ai',
	mistral: 'mistralai',
	deepseek: 'deepseek',
	cohere: 'cohere',
	moonshotai: 'moonshotai',
	alibaba: 'qwen',
	minimax: 'minimax',
};

/** Hosts that serve other vendors' models as `<vendor>/<model>`. A host model
 *  with no vendor segment (e.g. `groq/llama-3.1-8b-instant`) has no OpenRouter twin. */
export const OPENROUTER_HOST_PROVIDERS: ReadonlySet<string> = new Set<AgentModelProvider>([
	'groq',
	'nvidia',
	'vercel',
]);

/** Host vendor segments whose OpenRouter slug differs. */
export const OPENROUTER_VENDOR_ALIASES: Readonly<Record<string, string>> = {
	meta: 'meta-llama',
	xai: 'x-ai',
	mistral: 'mistralai',
	alibaba: 'qwen',
};

/** Models OpenRouter has no fixed id for. `-latest` aliases move under the
 *  provider's feet; preview codenames are not listed. They go to the tier table. */
export const NO_OPENROUTER_TWIN: readonly RegExp[] = [/-latest$/, /(?:^|\/)gemini-4-hydrogen$/];

/** OpenRouter's free variants are heavily rate-limited, so a run uses the paid twin. */
export const OPENROUTER_FREE_SUFFIX = ':free';

export const MODEL_TIERS = ['small', 'mid', 'frontier'] as const;
export type ModelTier = (typeof MODEL_TIERS)[number];

/** Name tokens that place a model in a tier. A size token like `8b` or `405b`
 *  is matched separately (see `modelTier`). Anything else is `mid`. */
export const SMALL_MODEL_TOKENS: ReadonlySet<string> = new Set([
	'mini',
	'nano',
	'haiku',
	'flash',
	'lite',
	'small',
	'micro',
	'tiny',
	'instant',
]);
export const FRONTIER_MODEL_TOKENS: ReadonlySet<string> = new Set([
	'opus',
	'pro',
	'large',
	'ultra',
	'max',
]);

export interface ComparableModelFamily {
	credentialType: string;
	models: Record<ModelTier, string>;
}

/** Stand-ins for a model with no same-model route, in preference order. The
 *  first family whose credential has a real key wins. */
export const COMPARABLE_MODEL_FAMILIES: readonly ComparableModelFamily[] = [
	{
		credentialType: 'anthropicApi',
		models: {
			small: 'anthropic/claude-haiku-5-5',
			mid: 'anthropic/claude-sonnet-5-5',
			frontier: 'anthropic/claude-opus-5-5',
		},
	},
	{
		credentialType: 'openAiApi',
		models: { small: 'openai/gpt-5-mini', mid: 'openai/gpt-5.1', frontier: 'openai/gpt-5.5' },
	},
	{
		credentialType: 'openRouterApi',
		models: {
			small: 'openrouter/anthropic/claude-haiku-5.5',
			mid: 'openrouter/anthropic/claude-sonnet-5.5',
			frontier: 'openrouter/anthropic/claude-opus-5.5',
		},
	},
];
