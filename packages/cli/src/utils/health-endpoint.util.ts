import type { GlobalConfig } from '@n8n/config';

/**
 * Resolves the health endpoint path, respecting N8N_PATH configuration.
 *
 * Priority order:
 * 1. N8N_ENDPOINT_HEALTH (if explicitly set) - absolute override
 * 2. N8N_PATH + default health endpoint (if N8N_PATH is set)
 * 3. Default health endpoint (/healthz)
 *
 */
export function resolveHealthEndpointPath(globalConfig: GlobalConfig): string {
	const isHealthEndpointCustomized = process.env.N8N_ENDPOINT_HEALTH !== undefined;

	if (!isHealthEndpointCustomized && globalConfig.path !== '/') {
		return globalConfig.path + globalConfig.endpoints.health;
	}

	return globalConfig.endpoints.health;
}
