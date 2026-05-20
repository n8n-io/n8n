import type { AgentJsonConfig } from '@n8n/api-types';

import { resolveProviderToolName } from './provider-tool-aliases';

function normalizeProviderToolName(name: string): string {
	return resolveProviderToolName(name).toLowerCase();
}

export function isWebSearchProviderToolName(name: string): boolean {
	const resolved = normalizeProviderToolName(name);

	return (
		resolved === 'openai.web_search' ||
		resolved === 'xai.web_search' ||
		resolved === 'google.google_search' ||
		resolved === 'google.enterprise_web_search' ||
		resolved.startsWith('anthropic.web_search')
	);
}

export function findManualWebSearchProviderToolName(
	config: Pick<AgentJsonConfig, 'providerTools'>,
): string | undefined {
	for (const name of Object.keys(config.providerTools ?? {})) {
		if (isWebSearchProviderToolName(name)) return name;
	}
	return undefined;
}

export function assertNoManualWebSearchProviderTools(config: AgentJsonConfig): void {
	if (!config.webSearch?.enabled) return;

	const name = findManualWebSearchProviderToolName(config);
	if (!name) return;

	throw new Error(
		`Do not configure web-search providerTools manually when webSearch.enabled is true. Remove "${name}" and use webSearch instead.`,
	);
}
