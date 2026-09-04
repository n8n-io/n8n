import type { IExecuteFunctions, ILoadOptionsFunctions, ISupplyDataFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

type TokenContext = IExecuteFunctions | ISupplyDataFunctions | ILoadOptionsFunctions;

export interface OAuth2TokenData {
	access_token?: string;
	refresh_token?: string;
	expires_in?: number;
	n8n_expires_at?: string;
}

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

const REFRESH_BUFFER_MS = 2 * 60 * 1000;
const REFRESH_BUFFER_RATIO = 0.1;

/** Thrown when only a new sign-in can recover the credential. */
export class OAuth2SessionExpiredError extends NodeOperationError {}

/** Buffered so a request cannot outlive the token; short tokens get a smaller buffer. */
export function isNearExpiry(tokenData: OAuth2TokenData | undefined): boolean {
	if (!tokenData?.refresh_token) return false;

	const expiresAt = Number(tokenData.n8n_expires_at);
	if (!Number.isFinite(expiresAt)) return false;

	const expiresInMs = Number(tokenData.expires_in) * 1000;
	const buffer =
		Number.isFinite(expiresInMs) && expiresInMs > 0
			? Math.min(REFRESH_BUFFER_MS, expiresInMs * REFRESH_BUFFER_RATIO)
			: REFRESH_BUFFER_MS;

	return Date.now() + buffer >= expiresAt;
}

/** Model SDKs rewrite what their fetch hook throws, so the original survives only on `cause`. */
export function findSessionExpiredError(error: unknown): OAuth2SessionExpiredError | undefined {
	const seen = new Set<unknown>();
	let current = error;
	while (current && typeof current === 'object' && !seen.has(current)) {
		if (current instanceof OAuth2SessionExpiredError) return current;
		seen.add(current);
		current = (current as { cause?: unknown }).cause;
	}
	return undefined;
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
		} catch {
			return null;
		}
	};

	return {
		expiredStatus: credential.tokenExpiredStatusCode ?? 401,

		getToken: async () => {
			// A failed refresh is not fatal; the server rejection reads better
			if (isNearExpiry(tokenData)) await refresh();

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
