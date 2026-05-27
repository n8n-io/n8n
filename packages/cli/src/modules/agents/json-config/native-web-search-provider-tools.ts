import {
	NATIVE_WEB_SEARCH_DEFAULTS_BY_PROVIDER,
	NATIVE_WEB_SEARCH_PROVIDER_BY_TOOL,
	NATIVE_WEB_SEARCH_PROVIDER_TOOLS,
	NATIVE_WEB_SEARCH_TOOL_BY_PROVIDER,
	type AgentJsonConfig,
	type NativeWebSearchProvider,
} from '@n8n/api-types';

export function getProviderPrefix(modelId: string): string {
	const slashIdx = modelId.indexOf('/');
	return slashIdx !== -1 ? modelId.slice(0, slashIdx) : '';
}

function isNativeWebSearchProvider(provider: string): provider is NativeWebSearchProvider {
	return provider in NATIVE_WEB_SEARCH_TOOL_BY_PROVIDER;
}

export function hasNativeWebSearchProvider(modelId: string): boolean {
	return isNativeWebSearchProvider(getProviderPrefix(modelId));
}

export function isNativeWebSearchRequested(config: AgentJsonConfig): boolean {
	const webSearch = config.config?.webSearch;
	return (
		webSearch?.provider === undefined ||
		webSearch.provider === 'auto' ||
		webSearch.provider === 'native'
	);
}

/**
 * Centralizes the policy for native web-search provider tools. `config.webSearch`
 * is the source of truth; provider-tool entries are derived execution details
 * that must be kept in sync with the selected model provider.
 */
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
					providerTools[toolName] = {
						...nativeWebSearch.args,
						...providerTools[toolName],
					};
				}
			}
		}
	}

	return providerTools;
}
