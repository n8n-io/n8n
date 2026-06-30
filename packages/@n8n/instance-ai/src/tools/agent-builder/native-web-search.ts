/**
 * Native web-search provider-tool policy, ported from the CLI agent builder
 * (`json-config/native-web-search-provider-tools.ts`). Pure: depends only on the
 * `@n8n/api-types` provider-capability constants. `config.webSearch` is the
 * source of truth; provider-tool entries are derived execution details kept in
 * sync with the selected model provider.
 */
import {
	NATIVE_WEB_SEARCH_DEFAULTS_BY_PROVIDER,
	NATIVE_WEB_SEARCH_PROVIDER_BY_TOOL,
	NATIVE_WEB_SEARCH_PROVIDER_TOOLS,
	NATIVE_WEB_SEARCH_TOOL_BY_PROVIDER,
	type AgentJsonConfig,
	type ConfigValidationError,
	type NativeWebSearchProvider,
} from '@n8n/api-types';

/** Provider prefix from a "provider/model" id (e.g. "anthropic/claude-…" → "anthropic"). */
function getProviderPrefix(modelId: string): string {
	const slashIdx = modelId.indexOf('/');
	return slashIdx !== -1 ? modelId.slice(0, slashIdx) : '';
}

function isNativeWebSearchProvider(provider: string): provider is NativeWebSearchProvider {
	return provider in NATIVE_WEB_SEARCH_TOOL_BY_PROVIDER;
}

export function hasNativeWebSearchProvider(modelId: string): boolean {
	return isNativeWebSearchProvider(getProviderPrefix(modelId));
}

function isNativeWebSearchRequested(config: AgentJsonConfig): boolean {
	const webSearch = config.config?.webSearch;
	return (
		webSearch?.provider === undefined ||
		webSearch.provider === 'auto' ||
		webSearch.provider === 'native'
	);
}

export function getNativeWebSearchProviderTools(
	config: AgentJsonConfig,
	options: { includeDefaultArgs: boolean; defaultEnabled?: boolean },
): Record<string, Record<string, unknown>> {
	const providerTools = { ...(config.providerTools ?? {}) };
	const providerPrefix = getProviderPrefix(config.model);
	const nativeWebSearch = isNativeWebSearchProvider(providerPrefix)
		? NATIVE_WEB_SEARCH_DEFAULTS_BY_PROVIDER[providerPrefix]
		: undefined;
	const explicitDisabled = config.config?.webSearch?.enabled === false;
	const isEnabled =
		!!nativeWebSearch &&
		isNativeWebSearchRequested(config) &&
		!explicitDisabled &&
		(options.defaultEnabled === true || config.config?.webSearch?.enabled === true);

	for (const key of NATIVE_WEB_SEARCH_PROVIDER_TOOLS) {
		const toolProvider = NATIVE_WEB_SEARCH_PROVIDER_BY_TOOL[key];
		if (!isEnabled || toolProvider !== providerPrefix) {
			delete providerTools[key];
		}
	}

	if (isEnabled) {
		const hasProviderWebSearchTool = Object.entries(NATIVE_WEB_SEARCH_PROVIDER_BY_TOOL).some(
			([toolName, toolProvider]) => toolProvider === providerPrefix && toolName in providerTools,
		);
		if (!hasProviderWebSearchTool) {
			providerTools[nativeWebSearch.toolName] = {};
		}

		if (options.includeDefaultArgs) {
			for (const [toolName, toolProvider] of Object.entries(NATIVE_WEB_SEARCH_PROVIDER_BY_TOOL)) {
				if (toolProvider === providerPrefix && toolName in providerTools) {
					providerTools[toolName] = { ...nativeWebSearch.args, ...providerTools[toolName] };
				}
			}
		}
	}

	return providerTools;
}

/** Reject configs that request native web search on a provider that doesn't support it. */
export function rejectIfUnsupportedNativeWebSearch(
	config: AgentJsonConfig,
): { errors: ConfigValidationError[] } | null {
	const webSearch = config.config?.webSearch;
	const requestsNativeWebSearch =
		webSearch?.enabled === true &&
		(webSearch.provider === undefined ||
			webSearch.provider === 'auto' ||
			webSearch.provider === 'native');
	if (!requestsNativeWebSearch || hasNativeWebSearchProvider(config.model)) return null;
	return {
		errors: [
			{
				path: '/config/webSearch/provider',
				message:
					'Native web search is only supported for Anthropic and OpenAI models. Use Brave or SearXNG fallback web search for this model.',
			},
		],
	};
}

/**
 * Persist provider-specific native web-search tool details so builder-saved
 * configs are deterministic. Mirrors the CLI write-path normalizer.
 */
export function applyNativeWebSearchBuilderDefaults(config: AgentJsonConfig): AgentJsonConfig {
	const providerTools = getNativeWebSearchProviderTools(config, {
		includeDefaultArgs: true,
		defaultEnabled: true,
	});
	const webSearch = config.config?.webSearch;
	const fallbackWebSearch =
		webSearch?.enabled === true &&
		(webSearch.provider === 'brave' || webSearch.provider === 'searxng');
	const hasNativeWebSearch =
		!fallbackWebSearch && webSearch?.enabled !== false && hasNativeWebSearchProvider(config.model);

	if (!hasNativeWebSearch) {
		const { webSearch: currentWebSearch, ...restConfig } = config.config ?? {};
		const { config: _config, providerTools: _providerTools, ...restAgentConfig } = config;
		const normalizedConfig = {
			...restConfig,
			...(fallbackWebSearch ? { webSearch: currentWebSearch } : {}),
		};
		return {
			...restAgentConfig,
			...(Object.keys(normalizedConfig).length > 0 ? { config: normalizedConfig } : {}),
			...(Object.keys(providerTools).length > 0 ? { providerTools } : {}),
		};
	}

	return {
		...config,
		config: { ...(config.config ?? {}), webSearch: { enabled: true } },
		providerTools,
	};
}
