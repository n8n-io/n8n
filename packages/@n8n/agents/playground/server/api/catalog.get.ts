import { fetchProviderCatalog, type ProviderCatalog } from '@n8n/agents';

let cachedCatalog: ProviderCatalog | undefined;

/**
 * Fetch and cache the provider/model catalog from models.dev.
 * Cached for the lifetime of the server process.
 */
export default defineEventHandler(async () => {
	if (!cachedCatalog) {
		try {
			cachedCatalog = await fetchProviderCatalog();
		} catch (e) {
			throw createError({
				statusCode: 502,
				statusMessage: e instanceof Error ? e.message : 'Failed to fetch provider catalog',
			});
		}
	}
	return cachedCatalog;
});
