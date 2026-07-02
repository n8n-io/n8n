/**
 * Native web-search policy helpers for the instance-ai agent builder. Pure:
 * depends only on the `@n8n/api-types` provider-capability constants.
 *
 * The write-path normalizer that used to live here has moved: provider-tool
 * reconciliation now happens once in the host's `AgentConfigService.updateConfig`
 * (the single write path), so the persisted config can't disagree with the read
 * path. What remains is the builder ergonomic (`applyNativeWebSearchDefaultOn`)
 * and the unsupported-provider guard the tool layer reports back to the model.
 */
import {
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
 * Builder ergonomic: turn native web search ON by default for a native-capable
 * model unless the user explicitly disabled it or chose a fallback provider.
 * Makes the default explicit in `config.webSearch` so the host's reconcile-only
 * write path derives the provider tools deterministically.
 */
export function applyNativeWebSearchDefaultOn(config: AgentJsonConfig): AgentJsonConfig {
	const webSearch = config.config?.webSearch;
	const explicitlyDisabled = webSearch?.enabled === false;
	const usesFallbackProvider = webSearch?.provider === 'brave' || webSearch?.provider === 'searxng';
	const shouldDefaultOn =
		hasNativeWebSearchProvider(config.model) &&
		isNativeWebSearchRequested(config) &&
		!explicitlyDisabled &&
		!usesFallbackProvider &&
		webSearch?.enabled !== true;

	if (!shouldDefaultOn) return config;

	return {
		...config,
		config: { ...(config.config ?? {}), webSearch: { ...webSearch, enabled: true } },
	};
}
