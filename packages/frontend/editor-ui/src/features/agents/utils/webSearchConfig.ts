import type { AgentJsonWebSearchConfig, AgentJsonWebSearchCredential } from '@n8n/api-types';

export type WebSearchMode = NonNullable<AgentJsonWebSearchConfig['mode']>;
export type AgentWebSearchCredentialType = AgentJsonWebSearchCredential['type'];

export const DEFAULT_WEB_SEARCH_MODE: WebSearchMode = 'auto';
export const DEFAULT_WEB_SEARCH_CREDENTIAL_TYPE: AgentWebSearchCredentialType = 'braveSearchApi';

export function isAgentWebSearchCredentialType(type: string): type is AgentWebSearchCredentialType {
	return type === 'braveSearchApi' || type === 'searXngApi';
}

export function getWebSearchCredentialType(
	current: AgentJsonWebSearchConfig | undefined,
): AgentWebSearchCredentialType {
	const credentialType = current?.credential?.type;
	return credentialType && isAgentWebSearchCredentialType(credentialType)
		? credentialType
		: DEFAULT_WEB_SEARCH_CREDENTIAL_TYPE;
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
