/**
 * Static capability map for LLM providers the agent runtime can target.
 */
export interface ProviderCapabilities {
	thinking: false | 'budgetTokens' | 'reasoningEffort';
	webSearch: false | 'anthropic.web_search' | 'openai.web_search' | 'google.google_search';
	providerTools: ReadonlyArray<
		| 'anthropic.web_search'
		| 'openai.web_search'
		| 'openai.image_generation'
		| 'google.google_search'
	>;
}

export const PROVIDER_CAPABILITIES: Record<string, ProviderCapabilities> = {
	anthropic: {
		thinking: 'budgetTokens',
		webSearch: 'anthropic.web_search',
		providerTools: ['anthropic.web_search'],
	},
	openai: {
		thinking: 'reasoningEffort',
		webSearch: 'openai.web_search',
		providerTools: ['openai.web_search', 'openai.image_generation'],
	},
	google: {
		thinking: false,
		webSearch: 'google.google_search',
		providerTools: ['google.google_search'],
	},
	xai: { thinking: false, webSearch: false, providerTools: [] },
	groq: { thinking: false, webSearch: false, providerTools: [] },
	deepseek: { thinking: false, webSearch: false, providerTools: [] },
	mistral: { thinking: false, webSearch: false, providerTools: [] },
	openrouter: { thinking: false, webSearch: false, providerTools: [] },
	cohere: { thinking: false, webSearch: false, providerTools: [] },
	ollama: { thinking: false, webSearch: false, providerTools: [] },
};

export const REASONING_EFFORT_OPTIONS = ['low', 'medium', 'high'] as const;
export type ReasoningEffort = (typeof REASONING_EFFORT_OPTIONS)[number];

export function getValidProviderToolNames(): string[] {
	return [
		...new Set(
			Object.values(PROVIDER_CAPABILITIES).flatMap((capabilities) => capabilities.providerTools),
		),
	];
}
