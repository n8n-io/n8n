import type { CustomFetch } from '@n8n/backend-network';

interface CreateAuthFetchOptions {
	/** Proxy-aware base `fetch` every request routes through (see `createAiProxyFetch`). */
	baseFetch: CustomFetch;
	initialHeaders: Record<string, string>;
	/**
	 * Called on a 401 response. Should return a fresh set of auth headers, or
	 * `null` if the refresh failed. The returned headers replace the cached
	 * set used by subsequent requests.
	 */
	onUnauthorized?: () => Promise<Record<string, string> | null>;
}

function headersToRecord(headers: HeadersInit | undefined): Record<string, string> {
	if (!headers) return {};
	if (headers instanceof Headers) return Object.fromEntries(headers.entries());
	if (Array.isArray(headers)) return Object.fromEntries(headers);
	return headers;
}

/**
 * Build a fetch wrapper that:
 *   1. routes through the supplied proxy-aware `baseFetch` (so corporate
 *      HTTP_PROXY settings apply uniformly),
 *   2. injects the latest auth headers on every request,
 *   3. on a single 401, calls `onUnauthorized` to refresh the token and
 *      retries the request once with the new headers.
 *
 * This mirrors the langchain MCP node's `createAuthFetch` so an agent's MCP
 * connection behaves identically to one configured via the workflow editor.
 */
export function createAuthFetch({
	baseFetch,
	initialHeaders,
	onUnauthorized,
}: CreateAuthFetchOptions): typeof fetch {
	let headers = initialHeaders;

	return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
		const response = await baseFetch(input, {
			...init,
			headers: { ...headersToRecord(init?.headers), ...headers },
		});

		if (response.status !== 401 || !onUnauthorized) return response;

		const refreshed = await onUnauthorized();
		if (!refreshed) return response;

		headers = refreshed;
		return await baseFetch(input, {
			...init,
			headers: { ...headersToRecord(init?.headers), ...headers },
		});
	};
}
