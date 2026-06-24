import { createVerify, X509Certificate } from 'node:crypto';

import { buildClientAssertion } from '@/client-assertion';
import { formatPrivateKey } from '@/format-private-key';

import * as config from './config';

function decodeSegment(segment: string) {
	return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8')) as Record<string, unknown>;
}

function expectedThumbprint(): string {
	const fingerprint = new X509Certificate(formatPrivateKey(config.certificate)).fingerprint;
	return Buffer.from(fingerprint.replace(/:/g, ''), 'hex').toString('base64url');
}

describe('buildClientAssertion', () => {
	it('signs an RS256 JWT with the x5t header and expected claims', () => {
		const assertion = buildClientAssertion({
			clientId: config.clientId,
			accessTokenUri: config.accessTokenUri,
			privateKey: config.privateKey,
			certificate: config.certificate,
		});

		const [headerSeg, payloadSeg, signatureSeg] = assertion.split('.');
		const header = decodeSegment(headerSeg);
		const payload = decodeSegment(payloadSeg);

		expect(header).toMatchObject({ alg: 'RS256', typ: 'JWT', x5t: expectedThumbprint() });
		expect(payload).toMatchObject({
			aud: config.accessTokenUri,
			iss: config.clientId,
			sub: config.clientId,
		});
		expect(payload.jti).toEqual(expect.any(String));
		expect(payload.exp as number).toBeGreaterThan(payload.iat as number);

		const verified = createVerify('RSA-SHA256')
			.update(`${headerSeg}.${payloadSeg}`)
			.verify(
				new X509Certificate(formatPrivateKey(config.certificate)).publicKey,
				Buffer.from(signatureSeg, 'base64url'),
			);
		expect(verified).toBe(true);
	});

	it('throws when the certificate is not a valid X.509 certificate', () => {
		expect(() =>
			buildClientAssertion({
				clientId: config.clientId,
				accessTokenUri: config.accessTokenUri,
				privateKey: config.privateKey,
				certificate: 'not-a-valid-certificate',
			}),
		).toThrow();
	});

	it('throws when the private key is invalid', () => {
		expect(() =>
			buildClientAssertion({
				clientId: config.clientId,
				accessTokenUri: config.accessTokenUri,
				privateKey: 'not-a-valid-key',
				certificate: config.certificate,
			}),
		).toThrow();
	});
});
