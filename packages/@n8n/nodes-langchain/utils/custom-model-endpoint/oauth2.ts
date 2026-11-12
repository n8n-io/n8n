import { isRecord } from '@n8n/utils/is-record';
import { OperationalError, UserError } from 'n8n-workflow';

import { messageFromBody, truncateMessage } from './error-handling';
import { oauth2BasicCredentials } from './headers';
import type { OAuth2Login } from './types';

const CLOCK_SKEW_MARGIN_MS = 30_000;
const TOKEN_REQUEST_TIMEOUT_MS = 30_000;
const ASSUMED_LIFETIME_SECONDS = 3600;

export interface AccessTokenSource {
	getToken: () => Promise<string>;
	forgetToken: () => void;
}

interface CachedToken {
	accessToken: string;
	expiresAt: number;
}

export interface TokenRequest {
	method: 'POST';
	headers: Record<string, string>;
	body: string;
	/** A token endpoint has no reason to redirect a POST, and following one replays the secret. */
	redirect: 'manual';
	timeout: number;
}

export function clientCredentialsTokenRequest(login: OAuth2Login): TokenRequest {
	const body = new URLSearchParams({ grant_type: 'client_credentials' });
	if (login.scope) body.set('scope', login.scope);

	const headers: Record<string, string> = {
		'content-type': 'application/x-www-form-urlencoded',
		accept: 'application/json',
	};

	if (login.sendCredentialsIn === 'body') {
		body.set('client_id', login.clientId);
		body.set('client_secret', login.clientSecret);
	} else {
		headers.authorization = `Basic ${oauth2BasicCredentials(login)}`;
	}

	return {
		method: 'POST',
		headers,
		body: body.toString(),
		redirect: 'manual',
		timeout: TOKEN_REQUEST_TIMEOUT_MS,
	};
}

function refusedToSignIn(text: string, status: number): UserError {
	const stated = messageFromBody(text.trim());
	const reason =
		stated === undefined ? `the login server answered ${status}` : truncateMessage(stated);

	return new UserError(`Could not sign in to the gateway: ${reason}`, {
		description: 'Check the token URL, client ID, client secret and scope on the credential.',
	});
}

/** Trimmed because `Headers` trims it anyway, and a padded token is not worth sending. */
export function accessTokenIn(parsed: unknown): string {
	const stated =
		isRecord(parsed) && typeof parsed.access_token === 'string' ? parsed.access_token : '';
	const token = stated.trim();
	if (token.length === 0) throw new OperationalError('The login server returned no access token');
	return token;
}

function statedLifetime(parsed: unknown): number {
	const stated = isRecord(parsed) ? parsed.expires_in : undefined;
	if (typeof stated === 'number') return stated;
	if (typeof stated === 'string') return Number.parseFloat(stated);
	return NaN;
}

function lifetimeSeconds(parsed: unknown): number {
	const stated = statedLifetime(parsed);
	return Number.isFinite(stated) ? stated : ASSUMED_LIFETIME_SECONDS;
}

function readToken(text: string): CachedToken {
	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch {
		throw new UserError('The login server did not answer with JSON', {
			description: 'Check that the token URL points at the token endpoint of the login server.',
		});
	}
	return {
		accessToken: accessTokenIn(parsed),
		expiresAt: Date.now() + lifetimeSeconds(parsed) * 1000 - CLOCK_SKEW_MARGIN_MS,
	};
}

/** The credential stores no token: this one lives in memory only. */
export function createClientCredentialsTokenSource(
	login: OAuth2Login,
	fetchToken: typeof fetch,
): AccessTokenSource {
	let cached: CachedToken | undefined;
	let inFlight: Promise<CachedToken> | undefined;

	const request = async (): Promise<CachedToken> => {
		const { timeout, ...init } = clientCredentialsTokenRequest(login);
		const deadline = AbortSignal.timeout(timeout);
		const response = await fetchToken(login.tokenUrl, { ...init, signal: deadline }).catch(
			(error: unknown) => {
				if (!deadline.aborted) throw error;
				throw new UserError(
					`Could not sign in to the gateway: the login server did not answer within ${timeout / 1000} seconds`,
					{ description: 'Check that the token URL is reachable from this n8n instance.' },
				);
			},
		);
		const text = await response.text();
		if (!response.ok) throw refusedToSignIn(text, response.status);
		return readToken(text);
	};

	return {
		getToken: async () => {
			if (cached && cached.expiresAt > Date.now()) return cached.accessToken;

			inFlight ??= request();
			try {
				cached = await inFlight;
			} finally {
				inFlight = undefined;
			}
			return cached.accessToken;
		},

		forgetToken: () => {
			cached = undefined;
		},
	};
}
