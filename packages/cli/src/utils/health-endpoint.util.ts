import type { GlobalConfig } from '@n8n/config';
import path from 'node:path';

/**
 * Resolves the health endpoint path for backend Express route registration.
 * Always returns the bare health endpoint — N8N_PATH should not affect
 * where backend routes are mounted on localhost.
 */
export function resolveBackendHealthEndpointPath(globalConfig: GlobalConfig): string {
	return globalConfig.endpoints.health;
}

/**
 * Resolves the health endpoint path for the frontend/editor UI.
 * Prepends N8N_PATH (with proper slash normalization) so the browser
 * fetches the correct URL through a reverse proxy.
 *
 * N8N_PATH is always prepended, also when N8N_ENDPOINT_HEALTH is set, because
 * the backend always serves the health endpoint without N8N_PATH.
 */
export function resolveFrontendHealthEndpointPath(globalConfig: GlobalConfig): string {
	return path.posix.join('/', globalConfig.path, globalConfig.endpoints.health);
}
