import { N8N_CLIENT_EDITOR_UI } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';

export type PublicApiClient = 'editor_ui' | 'other';

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

export function resolvePublicApiClient(header: string | string[] | undefined): PublicApiClient {
	const value = Array.isArray(header) ? header[0] : header;
	return value?.trim().toLowerCase() === N8N_CLIENT_EDITOR_UI ? 'editor_ui' : 'other';
}
