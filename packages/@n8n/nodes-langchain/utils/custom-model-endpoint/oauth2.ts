import { isRecord } from '@n8n/utils/is-record';
import { OperationalError, UserError } from 'n8n-workflow';

import { truncateMessage } from './error-handling';
import type { OAuth2Login } from './types';

const CLOCK_SKEW_MARGIN_MS = 30_000;
const ASSUMED_LIFETIME_SECONDS = 3600;

export interface AccessTokenSource {
	getToken: () => Promise<string>;
	forgetToken: () => void;
	/** The token in hand, so a gateway that echoes it back can be redacted. */
	currentToken: () => string | undefined;
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
}

/** Shared so the credential's own HTTP path mints a token exactly like the node transport does. */
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
		const pair = Buffer.from(`${login.clientId}:${login.clientSecret}`).toString('base64');
		headers.authorization = `Basic ${pair}`;
	}

	return { method: 'POST', headers, body: body.toString(), redirect: 'manual' };
}

function reasonFor(text: string, status: number, login: OAuth2Login): string {
	const stated = (() => {
		try {
			const parsed: unknown = JSON.parse(text);
			if (!isRecord(parsed)) return undefined;
			if (typeof parsed.error_description === 'string') return parsed.error_description;
			if (isRecord(parsed.error) && typeof parsed.error.message === 'string') {
				return parsed.error.message;
			}
			if (typeof parsed.error === 'string') return parsed.error;
		} catch {}
		return undefined;
	})();

	if (stated === undefined) return `the login server answered ${status}`;
	return truncateMessage(stated);
}

export function accessTokenIn(parsed: unknown): string {
	if (!isRecord(parsed) || typeof parsed.access_token !== 'string') {
		throw new OperationalError('The login server returned no access token');
	}
	return parsed.access_token;
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
	const accessToken = accessTokenIn(parsed);

	const lifetime = isRecord(parsed)
		? Number(parsed.expires_in) || ASSUMED_LIFETIME_SECONDS
		: ASSUMED_LIFETIME_SECONDS;
	return {
		accessToken,
		expiresAt: Date.now() + lifetime * 1000 - CLOCK_SKEW_MARGIN_MS,
	};
}

/**
 * The credential stores no token: this one lives in memory for as long as the
 * gateway said, and is fetched again on expiry or after the gateway rejects it.
 */
export function createClientCredentialsTokenSource(
	login: OAuth2Login,
	fetchToken: typeof fetch,
): AccessTokenSource {
	let cached: CachedToken | undefined;
	let inFlight: Promise<CachedToken> | undefined;

	const request = async (): Promise<CachedToken> => {
		const response = await fetchToken(login.tokenUrl, clientCredentialsTokenRequest(login));
		const text = await response.text();
		if (!response.ok) {
			const reason = reasonFor(text, response.status, login);
			throw new UserError(`Could not sign in to the gateway: ${reason}`, {
				description: 'Check the token URL, client ID, client secret and scope on the credential.',
			});
		}
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

		currentToken: () => cached?.accessToken,
	};
}
