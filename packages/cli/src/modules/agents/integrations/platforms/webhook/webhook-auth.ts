import { formatPemBlock } from '@n8n/utils/format-pem-block';
import { verify } from 'jsonwebtoken';
import { timingSafeEqual } from 'node:crypto';

import { WebhookChannelError } from './responses-api';

type Headers = Readonly<Record<string, string | string[] | undefined>>;

/** The signing algorithms of the JWT credential: HS, RS, ES, or PS with 256, 384, or 512 bits. `none` is not one. */
type SigningAlgorithm = `${'HS' | 'RS' | 'ES' | 'PS'}${256 | 384 | 512}`;
const isSigningAlgorithm = (value: unknown): value is SigningAlgorithm =>
	typeof value === 'string' && /^(HS|RS|ES|PS)(256|384|512)$/.test(value);

const credentialIncomplete = () =>
	new WebhookChannelError(
		500,
		'credential_unavailable',
		'The webhook credential is incomplete or uses no signing algorithm',
	);

/**
 * Checks the caller against the channel credential: 401 when the caller sends
 * no credentials, 403 when they are wrong. Unlike the Webhook node, a header
 * value compares in constant time and a JWT credential must use a signing algorithm.
 */
export function authenticateWebhookRequest(
	headers: Headers,
	authentication: 'headerAuth' | 'jwtAuth',
	credential: Record<string, unknown>,
): void {
	if (authentication === 'headerAuth') checkHeader(headers, credential);
	else checkJwt(headers, credential);
}

function checkHeader(headers: Headers, { name, value }: Record<string, unknown>) {
	if (typeof name !== 'string' || !name || typeof value !== 'string' || !value) {
		throw credentialIncomplete();
	}
	const received = headers[name.toLowerCase()];
	if (typeof received !== 'string' || received === '') {
		throw new WebhookChannelError(401, 'missing_credentials', 'No authorization data provided');
	}
	if (!safeEqual(received, value)) {
		throw new WebhookChannelError(403, 'invalid_credentials', 'Authorization data is wrong');
	}
}

function checkJwt(headers: Headers, credential: Record<string, unknown>) {
	const { keyType, secret, publicKey, algorithm } = credential;
	// A PEM credential uses its public key only, never a secret left from an earlier setup.
	const key =
		keyType === 'pemKey'
			? typeof publicKey === 'string' && formatPemBlock(publicKey, true)
			: secret;
	if (typeof key !== 'string' || !key || !isSigningAlgorithm(algorithm)) {
		throw credentialIncomplete();
	}
	const { authorization } = headers;
	const [scheme, token] = typeof authorization === 'string' ? authorization.split(' ') : [];
	if (scheme?.toLowerCase() !== 'bearer' || !token) {
		throw new WebhookChannelError(401, 'missing_token', 'No token provided');
	}
	try {
		verify(token, key, { algorithms: [algorithm] });
	} catch {
		throw new WebhookChannelError(403, 'invalid_token', 'The token does not verify');
	}
}

function safeEqual(received: string, expected: string) {
	const a = Buffer.from(received);
	const b = Buffer.from(expected);
	return a.length === b.length && timingSafeEqual(a, b);
}
