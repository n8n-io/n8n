import { AGENT_MODEL_PROVIDERS } from '@n8n/api-types';

export function filterOfferedAgentModelProviders<TProvider>(
	catalog: Record<string, TProvider>,
): Record<string, TProvider> {
	const filteredCatalog: Record<string, TProvider> = {};

	for (const provider of AGENT_MODEL_PROVIDERS) {
		const providerInfo = catalog[provider];
		if (providerInfo) {
			filteredCatalog[provider] = providerInfo;
		}
	}

	return filteredCatalog;
}
