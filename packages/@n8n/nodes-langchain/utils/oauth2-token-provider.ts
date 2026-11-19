import type { ClientOAuth2TokenData } from '@n8n/client-oauth2';
import { errorChain, type UnknownRecord } from '@n8n/utils/errors/error-chain';
import type { IExecuteFunctions, ILoadOptionsFunctions, ISupplyDataFunctions } from 'n8n-workflow';
import { NodeOperationError, shouldRefreshMcpOAuth2Token } from 'n8n-workflow';

type TokenContext = IExecuteFunctions | ISupplyDataFunctions | ILoadOptionsFunctions;

/**
 * What core stores on the credential. Every field is a string, and any of them
 * can be missing on a credential that was never connected.
 */
export type OAuth2TokenData = Partial<ClientOAuth2TokenData>;

export interface OAuth2UserCredential {
	oauthTokenData?: OAuth2TokenData;
	/** RFC 6750 says 401, but providers differ — Databricks uses 403. */
	tokenExpiredStatusCode?: number;
}

/** Model clients build their own transport, so they never reach the request helpers. */
export interface RefreshingTokenSource {
	getToken: () => Promise<string>;
	refreshAfterRejection?: () => Promise<string | null>;
	expiredStatus?: number;
}

/** Thrown when only a new sign-in can recover the credential. */
export class OAuth2SessionExpiredError extends NodeOperationError {}

/** Core reports a dead credential here, as plain data so no `instanceof` is needed. */
type CredentialInvalidError = { message?: string; description?: string };

function isCredentialInvalidError(error: unknown): error is CredentialInvalidError {
	if (typeof error !== 'object' || error === null || !('failure' in error)) return false;
	const { failure } = error;
	return (
		typeof failure === 'object' &&
		failure !== null &&
		'cause' in failure &&
		failure.cause === 'credential-invalid'
	);
}

const isSessionExpired = (
	value: UnknownRecord,
): value is UnknownRecord & OAuth2SessionExpiredError => value instanceof OAuth2SessionExpiredError;

/**
 * Model SDKs rewrite what their fetch hook throws, so the original survives only
 * as a wrapped error. `errorChain` covers the keys they wrap under, including the
 * `errorResponse`/`reason` pair `NodeApiError` uses.
 */
export function findSessionExpiredError(error: unknown): OAuth2SessionExpiredError | undefined {
	return errorChain(error).find(isSessionExpired);
}

export function createRefreshingOAuth2TokenProvider(options: {
	ctx: TokenContext;
	credentialType: string;
	credential: OAuth2UserCredential;
	serviceName: string;
}): RefreshingTokenSource {
	const { ctx, credentialType, credential, serviceName } = options;
	const node = ctx.getNode();

	let tokenData = credential.oauthTokenData;

	const reconnectHint = `Open the ${serviceName} credential and select 'Connect' to sign in again.`;

	// Core persists the rotated refresh token, and coalesces concurrent refreshes
	const refresh = async (): Promise<string | null> => {
		try {
			const refreshed = (await ctx.helpers.refreshOAuth2Token.call(ctx, credentialType)) as
				| OAuth2TokenData
				| undefined;
			if (!refreshed?.access_token) return null;

			tokenData = refreshed;
			return refreshed.access_token;
		} catch (error) {
			// A transient failure is not fatal; the server rejection reads better
			if (!isCredentialInvalidError(error)) return null;

			// Only a new sign-in recovers this, so carry core's reconnect error out
			// instead of letting a doomed request come back as a bare 403
			throw new OAuth2SessionExpiredError(
				node,
				error.message ?? `${serviceName} credential needs to be reconnected`,
				{ description: error.description ?? reconnectHint },
			);
		}
	};

	return {
		expiredStatus: credential.tokenExpiredStatusCode ?? 401,

		getToken: async () => {
			// The shared expiry clock is MCP-named but provider-agnostic. No
			// `grantType`, because this provider only serves the user grant, where a
			// stored refresh token is what makes a refresh possible.
			// Only a dead credential throws here; a transient failure falls through
			// to the stored token, whose server rejection reads better
			if (shouldRefreshMcpOAuth2Token(tokenData)) await refresh();

			const accessToken = tokenData?.access_token;
			if (!accessToken) {
				throw new OAuth2SessionExpiredError(node, `${serviceName} credential is not connected`, {
					description: reconnectHint,
				});
			}
			return accessToken;
		},

		refreshAfterRejection: async () => await refresh(),
	};
}
