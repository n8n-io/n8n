import { isRecord } from '@n8n/utils/is-record';
import { UserError } from '@n8n/errors';

import { messageFromBody, truncateMessage, withoutSecrets } from './error-handling';
import { formEncoded, oauth2BasicCredentials } from './headers';
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

/**
 * A login server is free to echo what it was sent, so the credential is taken out of
 * the text by value before anything reads it. The shared pass then covers the
 * credential-shaped strings this does not know the value of.
 */
function withoutTheCredential(text: string, login: OAuth2Login): string {
	// Sent in the body the secret is form-encoded, so that spelling is what an echo returns
	const spellings = [
		login.clientSecret,
		formEncoded(login.clientSecret),
		oauth2BasicCredentials(login),
	];

	return withoutSecrets(
		text,
		[...new Set(spellings)].filter((secret) => secret.length > 0),
	);
}

function refusedToSignIn(text: string, status: number, login: OAuth2Login): UserError {
	// Filtered before trimming, as the gateway path is: `String.trim` takes a no-break space,
	// and a client secret is stored untrimmed, so trimming first leaves that spelling unmatched.
	// Filtered again after extraction, because that decodes the escapes a reader would see.
	const stated = messageFromBody(withoutTheCredential(text, login).trim());
	const reason = stated
		? truncateMessage(withoutTheCredential(stated, login))
		: `the login server answered ${status}`;

	return new UserError(`Could not sign in to the gateway: ${reason}`, {
		description: 'Check the token URL, client ID, client secret and scope on the credential.',
	});
}

/** RFC 6749 section 5.1 makes the type part of the grant, and every other type is proof of possession. */
function assertBearerType(parsed: unknown): void {
	const stated = isRecord(parsed) ? parsed.token_type : undefined;
	if (typeof stated !== 'string' || stated.toLowerCase() === 'bearer') return;

	throw new UserError(`The login server returned a ${stated} token, which n8n cannot send`, {
		description: 'Ask the login server for a Bearer token, which this credential sends.',
	});
}

/** Trimmed because `Headers` trims it anyway, and a padded token is not worth sending. */
function accessTokenIn(parsed: unknown): string {
	assertBearerType(parsed);
	const stated =
		isRecord(parsed) && typeof parsed.access_token === 'string' ? parsed.access_token : '';
	const token = stated.trim();
	if (token.length === 0) {
		throw new UserError('The login server returned no access token', {
			description: 'Check the client ID, client secret and scope on the credential.',
		});
	}
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
	// Half the lifetime at most, or a token that lives for 30 seconds is expired
	// the moment it arrives and every request mints another one.
	const lifetime = lifetimeSeconds(parsed) * 1000;
	return {
		accessToken: accessTokenIn(parsed),
		expiresAt: Date.now() + lifetime - Math.min(CLOCK_SKEW_MARGIN_MS, lifetime / 2),
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

		// The body is read under the same deadline, so the read belongs in the same handler
		const read = async () => {
			const response = await fetchToken(login.tokenUrl, { ...init, signal: deadline });
			return { ok: response.ok, status: response.status, text: await response.text() };
		};

		const { ok, status, text } = await read().catch((error: unknown) => {
			if (!deadline.aborted) throw error;
			throw new UserError(
				`Could not sign in to the gateway: the login server did not answer within ${timeout / 1000} seconds`,
				{ description: 'Check that the token URL is reachable from this n8n instance.' },
			);
		});

		if (!ok) throw refusedToSignIn(text, status, login);
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
