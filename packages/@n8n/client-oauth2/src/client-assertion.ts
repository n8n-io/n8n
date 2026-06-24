import { createSign, randomUUID, X509Certificate } from 'node:crypto';

import { formatPrivateKey } from './format-private-key';

// private_key_jwt (RFC 7521/7523): the client proves its identity with a JWT
// signed by its private key instead of a shared secret. The `x5t` header (SHA-1
// thumbprint of the certificate) tells the server which public key verifies it.
export const CLIENT_ASSERTION_TYPE = 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer';

const ASSERTION_TTL_SECONDS = 300;

function base64url(input: Buffer | string): string {
	return Buffer.from(input).toString('base64url');
}

function certificateThumbprint(certificate: string): string {
	const fingerprint = new X509Certificate(formatPrivateKey(certificate)).fingerprint;
	return Buffer.from(fingerprint.replace(/:/g, ''), 'hex').toString('base64url');
}

export interface BuildClientAssertionOptions {
	clientId: string;
	/** Token endpoint; used as the JWT `aud`. */
	accessTokenUri: string;
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
		iat: now,
		nbf: now,
		exp: now + ASSERTION_TTL_SECONDS,
	};
	const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
	const signature = createSign('RSA-SHA256')
		.update(signingInput)
		.sign(formatPrivateKey(options.privateKey));
	return `${signingInput}.${base64url(signature)}`;
}
