import type { AgentJsonConfig } from '../types';
import type { ProviderCapabilities } from '../provider-capabilities';

export const NATIVE_WEB_SEARCH_PROVIDER_TOOLS = [
	'anthropic.web_search',
	'anthropic.web_search_20250305',
	'anthropic.web_search_20260209',
	'openai.web_search',
] as const;

export type NativeWebSearchProviderTool = Exclude<ProviderCapabilities['webSearch'], false>;
export type NativeWebSearchArgs = Record<string, unknown>;
type WebSearchConfig = NonNullable<NonNullable<AgentJsonConfig['config']>['webSearch']>;
type WebSearchProvider = WebSearchConfig['provider'];
export type FallbackWebSearchProvider = 'brave' | 'searxng';
export type WebSearchMethod = 'native' | FallbackWebSearchProvider;

const ANTHROPIC_WEB_SEARCH_PROVIDER_TOOLS = [
	'anthropic.web_search',
	'anthropic.web_search_20250305',
	'anthropic.web_search_20260209',
] as const;

const DEFAULT_NATIVE_WEB_SEARCH_ARGS: Record<NativeWebSearchProviderTool, NativeWebSearchArgs> = {
	'anthropic.web_search': { maxUses: 5 },
	'openai.web_search': { externalWebAccess: true, searchContextSize: 'medium' },
};

export function isFallbackWebSearchProvider(
	provider: WebSearchProvider,
): provider is FallbackWebSearchProvider {
	return provider === 'brave' || provider === 'searxng';
}

export function stripNativeWebSearchProviderTools(
	providerTools: AgentJsonConfig['providerTools'],
): AgentJsonConfig['providerTools'] {
	if (!providerTools) return undefined;
	const next = { ...providerTools };
	for (const key of NATIVE_WEB_SEARCH_PROVIDER_TOOLS) {
		delete next[key];
	}
	return next;
}

export function getWebSearchMethod(
	config: AgentJsonConfig | null,
	hasNativeWebSearch: boolean,
): WebSearchMethod {
	const configuredProvider = config?.config?.webSearch?.provider;
	if (isFallbackWebSearchProvider(configuredProvider)) return configuredProvider;
	return hasNativeWebSearch ? 'native' : 'brave';
}

export function getNativeWebSearchArgs(
	config: AgentJsonConfig | null,
	providerTool: ProviderCapabilities['webSearch'],
): NativeWebSearchArgs {
	if (!providerTool) return {};
	if (providerTool === 'anthropic.web_search') {
		const matchingTool = ANTHROPIC_WEB_SEARCH_PROVIDER_TOOLS.find(
			(tool) => config?.providerTools?.[tool],
		);
		return { ...(matchingTool ? config?.providerTools?.[matchingTool] : {}) };
	}

	return { ...(config?.providerTools?.[providerTool] ?? {}) };
}

export function withNativeWebSearchConfig(
	config: AgentJsonConfig | null,
	enabled: boolean,
	providerTool: ProviderCapabilities['webSearch'],
	args: NativeWebSearchArgs = {},
): Partial<AgentJsonConfig> {
	const providerTools = { ...(stripNativeWebSearchProviderTools(config?.providerTools) ?? {}) };

	const changes: Partial<AgentJsonConfig> = {
		config: {
			...(config?.config ?? {}),
			webSearch: enabled ? { enabled: true, provider: 'native' } : { enabled: false },
		},
	};

	if (enabled && providerTool) {
		providerTools[providerTool] = {
			...DEFAULT_NATIVE_WEB_SEARCH_ARGS[providerTool],
			...args,
		};
	}

	if (config?.providerTools || (enabled && providerTool)) {
		changes.providerTools = providerTools;
	}

	return changes;
}

export function withWebSearchConfig(
	config: AgentJsonConfig | null,
	enabled: boolean,
	method: WebSearchMethod,
	providerTool: ProviderCapabilities['webSearch'],
	args: NativeWebSearchArgs = {},
	credential = '',
): Partial<AgentJsonConfig> {
	if (!enabled) {
		return {
			config: {
				...(config?.config ?? {}),
				webSearch: { enabled: false },
			},
			...(config?.providerTools && {
				providerTools: stripNativeWebSearchProviderTools(config.providerTools) ?? {},
			}),
		};
	}

	if (method === 'native' && providerTool) {
		return withNativeWebSearchConfig(config, true, providerTool, args);
	}

	const webSearch =
		method === 'native'
			? { enabled: false as const }
			: {
					enabled: true as const,
					provider: method,
					...(credential && { credential }),
				};

	return {
		config: {
			...(config?.config ?? {}),
			webSearch,
		},
		...(config?.providerTools && {
			providerTools: stripNativeWebSearchProviderTools(config.providerTools) ?? {},
		}),
	};
}

export function normalizeWebSearchForModelChange(
	config: AgentJsonConfig | null,
	nextProviderTool: ProviderCapabilities['webSearch'],
): Partial<AgentJsonConfig> {
	const webSearch = config?.config?.webSearch;
	if (!webSearch) {
		return config?.providerTools
			? { providerTools: stripNativeWebSearchProviderTools(config.providerTools) ?? {} }
			: {};
	}

	const method = getWebSearchMethod(config, Boolean(nextProviderTool));
	if (isFallbackWebSearchProvider(webSearch.provider)) {
		return withWebSearchConfig(
			config,
			webSearch.enabled,
			method,
			nextProviderTool,
			{},
			webSearch.credential,
		);
	}

	if (!webSearch.enabled) {
		return withWebSearchConfig(config, false, 'native', nextProviderTool);
	}

	return nextProviderTool
		? withNativeWebSearchConfig(config, true, nextProviderTool)
		: withWebSearchConfig(config, false, 'native', nextProviderTool);
}
