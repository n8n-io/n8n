import { AGENT_MODEL_PROVIDERS } from '@n8n/api-types';

export function filterOfferedAgentModelProviders<TProvider>(
	catalog: Record<string, TProvider>,
): Record<string, TProvider> {
	const filteredCatalog: Record<string, TProvider> = {};

	for (const provider of AGENT_MODEL_PROVIDERS) {
		// Only the connected Ollama server can say which models are installed.
		if (provider === 'ollama') continue;
		const providerInfo = catalog[provider];
		if (providerInfo) {
			filteredCatalog[provider] = providerInfo;
		}
	}

	return filteredCatalog;
}
