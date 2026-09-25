import type { CustomFetch } from '@n8n/backend-network';
import { isRecord } from '@n8n/utils/is-record';
import { isMcpOAuth2Authentication, shouldRefreshMcpOAuth2Token } from 'n8n-workflow';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';

import type { OauthService } from '@/oauth/oauth.service';
import {
	type AuthFetchDomainPolicy,
	createAuthFetch,
	getBearerTokenRevision,
	resolveAllowedDomains,
} from '@/utils/auth-fetch';

function isNativeOAuth2Credential(authentication: string): boolean {
	return (
		isMcpOAuth2Authentication(authentication) &&
		authentication !== 'mcpOAuth2Api' &&
		!authentication.endsWith('McpOAuth2Api')
	);
}

export function resolveMcpAuthDomainPolicy(
	authentication: string,
	credentialData: ICredentialDataDecryptedObject,
	mcpHostname: string | undefined,
): AuthFetchDomainPolicy | undefined {
	if (!isNativeOAuth2Credential(authentication) || !mcpHostname) {
		return resolveAllowedDomains(credentialData);
	}

	switch (credentialData.allowedHttpRequestDomains) {
		case 'none':
		case 'domains':
			return resolveAllowedDomains(credentialData);
		case 'all':
			return undefined;
		default:
			// An unset native OAuth policy is limited to the user-provided MCP host.
			return { mode: 'domains', domains: mcpHostname };
	}
}

export function createMcpAuthFetch({
	allowedDomains,
	authentication,
	baseFetch,
	credentialData,
	credentialId,
	initialHeaders,
	oauthService,
	projectId,
}: {
	allowedDomains?: AuthFetchDomainPolicy;
	authentication: string;
	baseFetch: CustomFetch;
	credentialData: ICredentialDataDecryptedObject;
	credentialId?: string;
	initialHeaders: Record<string, string>;
	oauthService: OauthService;
	projectId: string | null;
}): CustomFetch {
	const storedTokenData = credentialData.oauthTokenData;
	const oauthTokenData = isRecord(storedTokenData) ? { ...storedTokenData } : undefined;
	const refreshable =
		isMcpOAuth2Authentication(authentication) && credentialId !== undefined && projectId !== null;
	const onUnauthorized = refreshable
		? async (currentHeaders: Record<string, string>) => {
				if (!credentialId || !projectId) return null;
				const result = await oauthService.refreshOAuth2CredentialById(
					credentialId,
					projectId,
					getBearerTokenRevision(currentHeaders, oauthTokenData?.n8n_expires_at),
				);
				if (result && oauthTokenData) {
					if (result.expiresAt === undefined) {
						delete oauthTokenData.n8n_expires_at;
					} else {
						oauthTokenData.n8n_expires_at = String(result.expiresAt);
					}
					if (result.expiresInSeconds === undefined) {
						delete oauthTokenData.expires_in;
					} else {
						oauthTokenData.expires_in = result.expiresInSeconds;
					}
				}
				return result?.headers ?? null;
			}
		: undefined;

	return createAuthFetch({
		baseFetch,
		initialHeaders,
		onUnauthorized,
		...(onUnauthorized
			? {
					shouldRefresh: () =>
						shouldRefreshMcpOAuth2Token(oauthTokenData, credentialData.grantType),
				}
			: {}),
		allowedDomains,
	});
}
