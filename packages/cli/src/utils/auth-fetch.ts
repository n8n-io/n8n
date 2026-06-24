import { fetchFollowingRedirects } from '@n8n/ai-utilities';
import type { CustomFetch } from '@n8n/backend-network';
import { assertUrlAllowed, UserError } from 'n8n-workflow';
import type { DomainRestrictionMode, ICredentialDataDecryptedObject } from 'n8n-workflow';

export type AuthFetchDomainPolicy = { mode: 'domains'; domains: string } | { mode: 'none' };

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
	/**
	 * Domain policy from the credential. When set, the initial request and every
	 * redirect hop are validated so credentials are never sent to an
	 * unauthorized host. Mode `none` blocks all requests.
	 */
	allowedDomains?: AuthFetchDomainPolicy;
}

function headersToRecord(headers: HeadersInit | undefined): Record<string, string> {
	if (!headers) return {};
	if (headers instanceof Headers) return Object.fromEntries(headers.entries());
	if (Array.isArray(headers)) return Object.fromEntries(headers);
	return headers;
}

export function resolveAllowedDomains(
	credentialData: ICredentialDataDecryptedObject,
): AuthFetchDomainPolicy | undefined {
	const mode = credentialData.allowedHttpRequestDomains as DomainRestrictionMode | undefined;

	if (mode === 'none') return { mode: 'none' };

	if (mode === 'domains') {
		const domains =
			typeof credentialData.allowedDomains === 'string' ? credentialData.allowedDomains : '';

		return { mode: 'domains', domains };
	}

	return undefined;
}

function assertDomainPolicyAllowsUrl(url: string, policy: AuthFetchDomainPolicy): void {
	if (policy.mode === 'none') {
		throw new UserError('Credential is configured to block all outbound requests');
	}

	if (policy.domains.trim().length === 0) {
		throw new UserError(
			'Credential restricts requests to specific domains but none are configured',
		);
	}

	assertUrlAllowed({ url, allowedDomains: policy.domains });
}

/**
 * Build a fetch wrapper that:
 *   1. routes through n8n's `proxyFetch` (so corporate HTTP_PROXY settings
 *      apply uniformly),
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
	allowedDomains,
}: CreateAuthFetchOptions): typeof fetch {
	let headers = initialHeaders;

	const authedFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
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

	if (!allowedDomains) return authedFetch;

	return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
		const startUrl = input instanceof Request ? input.url : input;
		return await fetchFollowingRedirects(authedFetch, startUrl, init, {
			onBeforeHop: (hopUrl) => assertDomainPolicyAllowsUrl(hopUrl, allowedDomains),
		});
	};
}
