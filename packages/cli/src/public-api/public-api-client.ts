import { N8N_CLIENT_EDITOR_UI } from '@n8n/api-types';

/**
 * The client that sent a Public API call. Derived from the `x-n8n-client` header.
 * The header can be spoofed, so use this value for telemetry only.
 */
export type PublicApiClient = 'editor_ui' | 'other';

/** Maps the `x-n8n-client` header value to a `PublicApiClient`. Uses the first value of a repeated header. */
export function resolveClient(header: string | string[] | undefined): PublicApiClient {
	const value = Array.isArray(header) ? header[0] : header;
	return value?.trim().toLowerCase() === N8N_CLIENT_EDITOR_UI ? 'editor_ui' : 'other';
}
