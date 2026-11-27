import { N8N_CLIENT_EDITOR_UI } from '@n8n/constants';

import { resolveClientHeader } from '@/client-header';

export type InternalApiClient = 'editor_ui' | 'other';

const INTERNAL_API_CLIENT_BY_HEADER_VALUE = new Map<string, InternalApiClient>([
	[N8N_CLIENT_EDITOR_UI, 'editor_ui'],
]);

export function resolveInternalApiClient(
	headerValue: string | string[] | undefined,
): InternalApiClient {
	return resolveClientHeader({
		headerValue,
		clientByHeaderValue: INTERNAL_API_CLIENT_BY_HEADER_VALUE,
		fallback: 'other',
	});
}
