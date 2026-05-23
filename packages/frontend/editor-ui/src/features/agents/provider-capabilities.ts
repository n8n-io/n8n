/**
 * Static capability map for LLM providers the agent runtime can target.
 * Used by the Behavior panel to decide whether the Thinking toggle is
 * available for the currently-selected provider and which sub-control to
 * show (Anthropic → budget tokens, OpenAI → reasoning effort).
 */
export interface ProviderCapabilities {
	thinking: false | 'budgetTokens' | 'reasoningEffort';
	webSearch: false | 'anthropic.web_search' | 'openai.web_search' | 'google.google_search';
}

export const PROVIDER_CAPABILITIES: Record<string, ProviderCapabilities> = {
	anthropic: { thinking: 'budgetTokens', webSearch: 'anthropic.web_search' },
	openai: { thinking: 'reasoningEffort', webSearch: 'openai.web_search' },
	google: { thinking: false, webSearch: 'google.google_search' },
	xai: { thinking: false, webSearch: false },
	groq: { thinking: false, webSearch: false },
	deepseek: { thinking: false, webSearch: false },
	mistral: { thinking: false, webSearch: false },
	openrouter: { thinking: false, webSearch: false },
	cohere: { thinking: false, webSearch: false },
	ollama: { thinking: false, webSearch: false },
};

export const REASONING_EFFORT_OPTIONS = ['low', 'medium', 'high'] as const;
export type ReasoningEffort = (typeof REASONING_EFFORT_OPTIONS)[number];
