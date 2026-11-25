import { httpStatusFromError, isHttpRequestError } from '@n8n/backend-network';
import { OperationalError, UserError } from '@n8n/errors';
import { isRecord } from '@n8n/utils/is-record';
import { scrubSecretsInText } from '@n8n/utils/scrub-secrets';

import { getTokenRequestClient, hasAccessToken, TOKEN_REQUEST_TIMEOUT } from './token-request';

export interface ClientCredentialsConfig {
	tokenUrl?: unknown;
	clientId?: unknown;
	clientSecret?: unknown;
	scope?: unknown;
	/** RFC 6749 makes HTTP Basic the method a server must accept, so it is the default. */
	sendCredentialsIn?: unknown;
	allowedDomains?: string;
}

const ASSUMED_LIFETIME_SECONDS = 3600;
const RENEW_MARGIN_MS = 30_000;

const asFilledString = (value: unknown) =>
	typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

const REFUSAL_LENGTH = 300;

/** An endpoint can echo what it was sent, so never hand its words back with the secret still in them. */
function refusalFrom(error: unknown, clientSecret: string) {
	if (!isHttpRequestError(error)) return undefined;

	const data = error.response?.data;
	const said =
		typeof data === 'string'
			? asFilledString(data)
			: isRecord(data)
				? [data.error_description, data.error, data.message, data.detail]
						.map(asFilledString)
						.find((value) => value !== undefined)
				: undefined;
	if (said === undefined) return undefined;

	// Cut after the secret is out, not before: a cut that lands inside one would leave
	// the head of it behind, which the replacement no longer matches.
	return scrubSecretsInText(said.split(clientSecret).join('***')).slice(0, REFUSAL_LENGTH);
}

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

	const inBody = config.sendCredentialsIn === 'body';
	const body = new URLSearchParams({ grant_type: 'client_credentials' });
	if (inBody) {
		body.append('client_id', clientId);
		body.append('client_secret', clientSecret);
	}
	const scope = asFilledString(config.scope);
	if (scope) body.append('scope', scope);

	let response: unknown;
	try {
		response = await getTokenRequestClient('user-controlled').request({
			url: tokenUrl,
			method: 'POST',
			// RFC 6749 2.3.1 percent-encodes both halves before they are base64-encoded, so a
			// secret holding `+`, `%` or a space still reaches a compliant server intact. A
			// space stays `%20` rather than becoming `+`, because a server that percent-decodes
			// without treating the pair as a form would hand a `+` on as a literal one.
			...(inBody
				? {}
				: {
						auth: {
							username: encodeURIComponent(clientId),
							password: encodeURIComponent(clientSecret),
						},
					}),
			body: body.toString(),
			headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
			json: true,
			timeout: TOKEN_REQUEST_TIMEOUT,
			disableFollowRedirect: true,
			allowedDomains: config.allowedDomains,
		});
	} catch (error) {
		const status = httpStatusFromError(error);
		// No HTTP answer, so there is no body of the endpoint's to keep out of the error
		if (status === undefined) throw error;

		const refusal = refusalFrom(error, clientSecret);
		const said = refusal ? `: ${refusal}` : '';

		// Only these three say the credential is wrong, and reading any other status as a
		// refusal would send the user off to check a correct ID and secret.
		if (status === 400 || status === 401 || status === 403) {
			throw new UserError(`The token endpoint refused the grant${said}`);
		}

		// A 429 or a 5xx is the endpoint having a bad day. Every other status answers the
		// token URL and the request, which the user set as well, so it is theirs to fix.
		const message = `The token endpoint answered ${status}${said}`;
		const theUserCanFixIt = status < 500 && status !== 429;
		throw theUserCanFixIt ? new UserError(message) : new OperationalError(message);
	}

	const accessToken = hasAccessToken(response) ? asFilledString(response.access_token) : undefined;
	if (!accessToken) {
		throw new OperationalError('The token endpoint returned no access token');
	}

	const expiresIn = Number((response as { expires_in?: unknown }).expires_in);
	const lifetimeMs =
		(Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : ASSUMED_LIFETIME_SECONDS) * 1000;
	return { accessToken, lifetimeMs };
}

/**
 * Holds one token for as long as the endpoint says it lives, so a caller that
 * outlives a token, such as a trigger holding one client for an activation,
 * keeps working. One in-flight request is shared rather than repeated.
 */
export function createClientCredentialsTokenSource(
	config: ClientCredentialsConfig,
	now: () => number = Date.now,
) {
	let cached: { accessToken: string; expiresAt: number } | undefined;
	let inFlight: Promise<string> | undefined;

	const mint = async () => {
		const { accessToken, lifetimeMs } = await requestClientCredentialsToken(config);
		cached = {
			accessToken,
			expiresAt: now() + lifetimeMs - Math.min(RENEW_MARGIN_MS, lifetimeMs / 2),
		};
		return accessToken;
	};

	return {
		async getToken(): Promise<string> {
			if (cached && cached.expiresAt > now()) return cached.accessToken;
			inFlight ??= mint().finally(() => {
				inFlight = undefined;
			});
			return await inFlight;
		},
	};
}
