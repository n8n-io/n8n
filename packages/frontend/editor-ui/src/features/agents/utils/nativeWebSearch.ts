import type { AgentJsonConfig } from '../types';
import type { ProviderCapabilities } from '../provider-capabilities';

export const NATIVE_WEB_SEARCH_PROVIDER_TOOLS = [
	'anthropic.web_search',
	'anthropic.web_search_20250305',
	'anthropic.web_search_20260209',
	'openai.web_search',
	'google.google_search',
] as const;

export type NativeWebSearchProviderTool = Exclude<ProviderCapabilities['webSearch'], false>;
export type NativeWebSearchArgs = Record<string, unknown>;

const ANTHROPIC_WEB_SEARCH_PROVIDER_TOOLS = [
	'anthropic.web_search',
	'anthropic.web_search_20250305',
	'anthropic.web_search_20260209',
] as const;

export function isNativeWebSearchEnabled(
	config: AgentJsonConfig | null,
	providerTool: ProviderCapabilities['webSearch'],
): boolean {
	return !!providerTool && config?.config?.webSearch?.enabled === true;
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
	const providerTools = { ...(config?.providerTools ?? {}) };
	for (const key of NATIVE_WEB_SEARCH_PROVIDER_TOOLS) {
		delete providerTools[key];
	}

	const changes: Partial<AgentJsonConfig> = {
		config: {
			...(config?.config ?? {}),
			webSearch: { enabled },
		},
	};

	if (enabled && providerTool) {
		providerTools[providerTool] = args;
	}

	if (config?.providerTools || (enabled && providerTool)) {
		changes.providerTools = providerTools;
	}

	return changes;
}
