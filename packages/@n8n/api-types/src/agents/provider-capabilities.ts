/**
 * Static capability map for LLM providers the agent runtime can target.
 */
export const NATIVE_WEB_SEARCH_PROVIDER_TOOLS = [
	'anthropic.web_search',
	'anthropic.web_search_20250305',
	'anthropic.web_search_20260209',
	'openai.web_search',
] as const;

export type NativeWebSearchProviderTool = (typeof NATIVE_WEB_SEARCH_PROVIDER_TOOLS)[number];

export const ANTHROPIC_NATIVE_WEB_SEARCH_PROVIDER_TOOLS = [
	'anthropic.web_search',
	'anthropic.web_search_20250305',
	'anthropic.web_search_20260209',
] as const satisfies readonly NativeWebSearchProviderTool[];

export const NATIVE_WEB_SEARCH_TOOL_BY_PROVIDER = {
	anthropic: 'anthropic.web_search',
	openai: 'openai.web_search',
} as const satisfies Record<string, NativeWebSearchProviderTool>;

export type NativeWebSearchProvider = keyof typeof NATIVE_WEB_SEARCH_TOOL_BY_PROVIDER;
export type NativeWebSearchCanonicalTool =
	(typeof NATIVE_WEB_SEARCH_TOOL_BY_PROVIDER)[NativeWebSearchProvider];

export const NATIVE_WEB_SEARCH_PROVIDER_BY_TOOL = {
	'anthropic.web_search': 'anthropic',
	'anthropic.web_search_20250305': 'anthropic',
	'anthropic.web_search_20260209': 'anthropic',
	'openai.web_search': 'openai',
} as const satisfies Record<NativeWebSearchProviderTool, NativeWebSearchProvider>;

export const NATIVE_WEB_SEARCH_DEFAULTS_BY_PROVIDER = {
	anthropic: { toolName: 'anthropic.web_search', args: { maxUses: 5 } },
	openai: {
		toolName: 'openai.web_search',
		args: { externalWebAccess: true, searchContextSize: 'medium' },
	},
} as const satisfies Record<
	NativeWebSearchProvider,
	{ toolName: NativeWebSearchCanonicalTool; args: Record<string, unknown> }
>;

export interface ProviderCapabilities {
	thinking: false | 'budgetTokens' | 'reasoningEffort';
	webSearch: false | NativeWebSearchCanonicalTool;
	providerTools: ReadonlyArray<NativeWebSearchCanonicalTool | 'openai.image_generation'>;
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
		webSearch: false,
		providerTools: [],
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
