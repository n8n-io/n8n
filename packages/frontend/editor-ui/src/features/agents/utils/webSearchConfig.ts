import type { AgentJsonWebSearchConfig, AgentJsonWebSearchCredential } from '@n8n/api-types';

export type WebSearchMode = NonNullable<AgentJsonWebSearchConfig['mode']>;
export type AgentWebSearchCredentialType = Extract<
	AgentJsonWebSearchCredential['type'],
	'braveSearchApi'
>;

export const DEFAULT_WEB_SEARCH_MODE: WebSearchMode = 'auto';

export function isAgentWebSearchCredentialType(type: string): type is AgentWebSearchCredentialType {
	return type === 'braveSearchApi';
}

export function setWebSearchEnabled(
	current: AgentJsonWebSearchConfig | undefined,
	enabled: boolean,
): AgentJsonWebSearchConfig {
	if (!enabled) {
		return { ...current, enabled: false };
	}

	return { ...current, enabled: true, mode: current?.mode ?? DEFAULT_WEB_SEARCH_MODE };
}

export function setWebSearchMode(
	current: AgentJsonWebSearchConfig | undefined,
	mode: WebSearchMode,
): AgentJsonWebSearchConfig {
	return {
		...current,
		enabled: current?.enabled ?? true,
		mode,
	};
}

export function setWebSearchCredential(
	current: AgentJsonWebSearchConfig | undefined,
	credential: AgentJsonWebSearchCredential,
): AgentJsonWebSearchConfig {
	return {
		...current,
		enabled: current?.enabled ?? true,
		mode: current?.mode ?? DEFAULT_WEB_SEARCH_MODE,
		credential,
	};
}
