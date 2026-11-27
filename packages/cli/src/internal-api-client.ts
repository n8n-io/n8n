import { N8N_CLIENT_EDITOR_UI } from '@n8n/constants';

import { resolveClientHeader } from '@/client-header';

export type InternalApiClient = 'editor_ui' | 'other';

const INTERNAL_API_CLIENT_BY_HEADER_VALUE = new Map<string, InternalApiClient>([
	[N8N_CLIENT_EDITOR_UI, 'editor_ui'],
]);

/**
 * Only the Editor UI is expected to call the Internal API, so every other caller,
 * including the n8n node and the CLI, counts as `other`.
 */
export function resolveInternalApiClient(header: string | string[] | undefined): InternalApiClient {
	return resolveClientHeader(header, INTERNAL_API_CLIENT_BY_HEADER_VALUE, 'other');
}
