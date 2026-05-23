import type { AgentJsonConfig } from '@n8n/api-types';

const NATIVE_WEB_SEARCH_PROVIDER_TOOLS = [
	'anthropic.web_search',
	'anthropic.web_search_20250305',
	'anthropic.web_search_20260209',
	'openai.web_search',
] as const;

const NATIVE_WEB_SEARCH_PROVIDER_BY_TOOL: Record<string, string> = {
	'anthropic.web_search': 'anthropic',
	'anthropic.web_search_20250305': 'anthropic',
	'anthropic.web_search_20260209': 'anthropic',
	'openai.web_search': 'openai',
};

const NATIVE_WEB_SEARCH_DEFAULTS_BY_PROVIDER: Record<
	string,
	{ toolName: string; args: Record<string, unknown> }
> = {
	anthropic: { toolName: 'anthropic.web_search', args: { maxUses: 5 } },
	openai: {
		toolName: 'openai.web_search',
		args: { externalWebAccess: true, searchContextSize: 'medium' },
	},
};

export function getProviderPrefix(modelId: string): string {
	const slashIdx = modelId.indexOf('/');
	return slashIdx !== -1 ? modelId.slice(0, slashIdx) : '';
}

export function hasNativeWebSearchProvider(modelId: string): boolean {
	return getProviderPrefix(modelId) in NATIVE_WEB_SEARCH_DEFAULTS_BY_PROVIDER;
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
	const nativeWebSearch = NATIVE_WEB_SEARCH_DEFAULTS_BY_PROVIDER[providerPrefix];
	const explicitDisabled = config.config?.webSearch?.enabled === false;
	const isEnabled =
		!!nativeWebSearch &&
		!explicitDisabled &&
		(options.defaultEnabled === true || config.config?.webSearch?.enabled === true);

	for (const key of NATIVE_WEB_SEARCH_PROVIDER_TOOLS) {
		const toolProvider = NATIVE_WEB_SEARCH_PROVIDER_BY_TOOL[key];
		if (!isEnabled || toolProvider !== providerPrefix) {
			delete providerTools[key];
		}
	}

	if (isEnabled) {
		const providerWebSearchTools = Object.entries(NATIVE_WEB_SEARCH_PROVIDER_BY_TOOL).filter(
			([, toolProvider]) => toolProvider === providerPrefix,
		);
		const hasProviderWebSearchTool = providerWebSearchTools.some(
			([toolName]) => toolName in providerTools,
		);
		if (!hasProviderWebSearchTool) {
			providerTools[nativeWebSearch.toolName] = {};
		}

		if (options.includeDefaultArgs) {
			for (const [toolName] of providerWebSearchTools) {
				if (toolName in providerTools) {
					providerTools[toolName] = { ...nativeWebSearch.args, ...providerTools[toolName] };
				}
			}
		}
	}

	return providerTools;
}
