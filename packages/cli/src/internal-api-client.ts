import { resolvePublicApiClient } from '@/public-api/public-api-client';

export type InternalApiClient = 'editor_ui' | 'other';

/**
 * Only the Editor UI is expected to call the Internal API, so every other caller,
 * including the n8n node and the CLI, counts as `other`.
 */
export function resolveInternalApiClient(header: string | string[] | undefined): InternalApiClient {
	return resolvePublicApiClient(header) === 'editor_ui' ? 'editor_ui' : 'other';
}
