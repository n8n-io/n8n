import { OperationalError, UserError } from '@n8n/errors';

import { getTokenRequestClient, hasAccessToken, TOKEN_REQUEST_TIMEOUT } from './token-request';

export interface ClientCredentialsConfig {
	tokenUrl?: unknown;
	clientId?: unknown;
	clientSecret?: unknown;
	scope?: unknown;
}

const ASSUMED_LIFETIME_SECONDS = 3600;
const RENEW_MARGIN_MS = 30_000;

const asFilledString = (value: unknown) =>
	typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

/**
 * Swaps a client ID and secret for a bearer token at a user-supplied endpoint,
 * through the outbound layer that carries n8n's SSRF guard, proxy and timeout.
 */
export async function requestClientCredentialsToken(config: ClientCredentialsConfig) {
	const tokenUrl = asFilledString(config.tokenUrl);
	const clientId = asFilledString(config.clientId);
	const clientSecret = asFilledString(config.clientSecret);

	if (!tokenUrl || !clientId || !clientSecret) {
		throw new UserError('Set the token URL, client ID and client secret');
	}

	const body = new URLSearchParams({
		grant_type: 'client_credentials',
		client_id: clientId,
		client_secret: clientSecret,
	});
	const scope = asFilledString(config.scope);
	if (scope) body.append('scope', scope);

	const response = await getTokenRequestClient('user-controlled').request({
		url: tokenUrl,
		method: 'POST',
		body: body.toString(),
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		json: true,
		timeout: TOKEN_REQUEST_TIMEOUT,
	});

	if (!hasAccessToken(response)) {
		throw new OperationalError('The token endpoint returned no access token');
	}

	const expiresIn = Number((response as { expires_in?: unknown }).expires_in);
	return {
		accessToken: response.access_token,
		expiresInSeconds:
			Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : ASSUMED_LIFETIME_SECONDS,
	};
}

/**
 * Holds one token for as long as the endpoint says it lives, so a caller that
 * outlives a token, such as a trigger holding one client for an activation,
 * keeps working.
 */
export function createClientCredentialsTokenSource(
	config: ClientCredentialsConfig,
	now: () => number = Date.now,
) {
	let cached: { accessToken: string; expiresAt: number } | undefined;

	return {
		async getToken(): Promise<string> {
			if (cached && cached.expiresAt > now()) return cached.accessToken;

			const { accessToken, expiresInSeconds } = await requestClientCredentialsToken(config);
			cached = { accessToken, expiresAt: now() + expiresInSeconds * 1000 - RENEW_MARGIN_MS };
			return accessToken;
		},
	};
}
