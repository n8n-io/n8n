import { N8N_CLIENT_EDITOR_UI, N8N_CLIENT_N8N_NODE } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';

export type PublicApiClient = 'editor_ui' | 'n8n_node' | 'other';

/** The client behind a public API call, or `false` when no public API route was used. */
export type PublicApiCaller = PublicApiClient | false;

export type PublicApiRequest<
	RouteParams = {},
	ResponseBody = {},
	RequestBody = {},
	RequestQuery = {},
> = AuthenticatedRequest<RouteParams, ResponseBody, RequestBody, RequestQuery> & {
	publicApiClient: PublicApiClient;
};

const TELEMETRY_CLIENT_BY_HEADER_VALUE = new Map<string, PublicApiClient>([
	[N8N_CLIENT_EDITOR_UI, 'editor_ui'],
	[N8N_CLIENT_N8N_NODE, 'n8n_node'],
]);

export function resolvePublicApiClient(header: string | string[] | undefined): PublicApiClient {
	const value = Array.isArray(header) ? header[0] : header;
	const normalizedValue = value?.trim().toLowerCase();
	if (normalizedValue === undefined) return 'other';

	return TELEMETRY_CLIENT_BY_HEADER_VALUE.get(normalizedValue) ?? 'other';
}
