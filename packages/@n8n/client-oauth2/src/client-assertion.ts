import { createSign, randomUUID, X509Certificate } from 'node:crypto';

import { formatPrivateKey } from './format-private-key';

// private_key_jwt (RFC 7521/7523): the client proves its identity with a JWT
// signed by its private key instead of a shared secret. The `x5t` header (SHA-1
// thumbprint of the certificate) tells the server which public key verifies it.
export const CLIENT_ASSERTION_TYPE = 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer';

const ASSERTION_TTL_SECONDS = 300;

// Backdate `iat`/`nbf` to tolerate the n8n host clock running ahead of the IdP;
// strict servers otherwise reject a just-issued assertion with `invalid_client`.
const CLOCK_SKEW_SECONDS = 60;

function base64url(input: Buffer | string): string {
	return Buffer.from(input).toString('base64url');
}

function certificateThumbprint(certificate: string): string {
	// `formatPrivateKey` also normalizes CERTIFICATE PEMs; the name-vs-usage
	// mismatch is resolved by the shared-helper rename tracked in ENT-114.
	const fingerprint = new X509Certificate(formatPrivateKey(certificate)).fingerprint;
	return Buffer.from(fingerprint.replace(/:/g, ''), 'hex').toString('base64url');
}

export interface BuildClientAssertionOptions {
	clientId: string;
	/** Token endpoint; used as the JWT `aud`. */
	accessTokenUri: string;
	/** RSA private key (PEM). Signing is RS256-only; EC/Ed25519 keys are not supported. */
	privateKey: string;
	certificate: string;
}

export function buildClientAssertion(options: BuildClientAssertionOptions): string {
	const now = Math.floor(Date.now() / 1000);
	const header = { alg: 'RS256', typ: 'JWT', x5t: certificateThumbprint(options.certificate) };
	const payload = {
		aud: options.accessTokenUri,
		iss: options.clientId,
		sub: options.clientId,
		jti: randomUUID(),
		iat: now - CLOCK_SKEW_SECONDS,
		nbf: now - CLOCK_SKEW_SECONDS,
		exp: now + ASSERTION_TTL_SECONDS,
	};
	const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
	const signature = createSign('RSA-SHA256')
		.update(signingInput)
		.sign(formatPrivateKey(options.privateKey));
	return `${signingInput}.${base64url(signature)}`;
}
