import { createRefreshingAuthFetch } from '@n8n/ai-utilities';
import type { CustomFetch } from '@n8n/backend-network';
import { assertUrlAllowed, UserError } from 'n8n-workflow';
import type { DomainRestrictionMode, ICredentialDataDecryptedObject } from 'n8n-workflow';

export type AuthFetchDomainPolicy = { mode: 'domains'; domains: string } | { mode: 'none' };

export function getBearerTokenRevision(
	headers: Record<string, string>,
	expiresAtValue?: unknown,
): { accessToken?: string; expiresAt?: number } {
	const authorization = Object.entries(headers).find(
		([name]) => name.toLowerCase() === 'authorization',
	)?.[1];
	const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
	const expiresAt = Number(expiresAtValue);
	return {
		...(accessToken ? { accessToken } : {}),
		...(Number.isFinite(expiresAt) ? { expiresAt } : {}),
	};
}

interface CreateAuthFetchOptions {
	/** Proxy-aware base `fetch` every request routes through (see `createAiProxyFetch`). */
	baseFetch: CustomFetch;
	initialHeaders: Record<string, string>;
	/**
	 * Called on a 401 response. Should return a fresh set of auth headers, or
	 * `null` if the refresh failed. The returned headers replace the cached
	 * set used by subsequent requests.
	 */
	onUnauthorized?: (
		currentHeaders: Record<string, string>,
	) => Promise<Record<string, string> | null>;
	/** Return true when auth must refresh before the next request. */
	shouldRefresh?: () => boolean;
	/**
	 * Domain policy from the credential. When set, the initial request and every
	 * redirect hop are validated so credentials are never sent to an
	 * unauthorized host. Mode `none` blocks all requests.
	 */
	allowedDomains?: AuthFetchDomainPolicy;
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
 *   1. routes through the supplied proxy-aware `baseFetch` (so corporate
 *      HTTP_PROXY settings apply uniformly),
 *   2. injects the latest auth headers on every request,
 *   3. refreshes before a request when `shouldRefresh` returns true,
 *   4. on a single 401, calls `onUnauthorized` to refresh the token and
 *      retries the request once with the new headers,
 *   5. when a domain policy is set, follows redirects manually, validating
 *      every hop and withholding the auth headers once a hop crosses origins.
 *
 * This mirrors the langchain MCP node's `createAuthFetch` so an agent's MCP
 * connection behaves identically to one configured via the workflow editor.
 */
export function createAuthFetch({
	baseFetch,
	initialHeaders,
	onUnauthorized,
	shouldRefresh,
	allowedDomains,
}: CreateAuthFetchOptions): typeof fetch {
	return createRefreshingAuthFetch({
		baseFetch,
		initialHeaders,
		...(onUnauthorized
			? {
					refreshHeaders: async (current: Headers) =>
						await onUnauthorized(Object.fromEntries(current.entries())),
				}
			: {}),
		...(shouldRefresh ? { shouldRefresh } : {}),
		...(allowedDomains
			? {
					assertAllowedUrl: (url: string) => assertDomainPolicyAllowsUrl(url, allowedDomains),
				}
			: {}),
	});
}
