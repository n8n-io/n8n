import { createVerify, generateKeyPairSync, X509Certificate } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { buildClientAssertion } from './client-assertion';
import { formatPemBlock } from './format-pem-block';

const clientId = 'abc';
const accessTokenUri = 'https://mock.auth.service/login/oauth/access_token';

const privateKey =
	'-----BEGIN PRIVATE KEY-----MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDOTbaad5QVCuNX/6JIIMN7mwi3I7w6PIoZJ9PalrFls+hg/93cPuqqjFtpBFt3QJONATdY1CHWHExAYv5QkXaf70Yf1B8zkuWgkcAuYBaRQAlSM0v3VRzBZwaJ6VcGB8Q6qlukavAy7PauAHAXgsbWfwQiTftP2JXiqW5rq0UQug9P8ehpyL5S4VCPgglFe1XpWAfSuPV5QJpDCN/tnERaL5f1XwN55l6lJ/sAN/S4oiRczgZ1gHX1Iu8yj2llpgVbZgZnBpqKWbqyQ1XA4EUsnwDnuO/EbApyzx3RLVB/PLd2BZHfG7F4GIy7X3DiL03v/RQ0Lkwz30nsBy9j2GsXAgMBAAECggEAfbIHwdF9ndyGa8VLINslf5gUFVFmi6z7DxyfDZ2m9CpLOV5r1JdY7xSZVUDcYaosvEqzaCHHg+a15rzp6jjWp9dnSFk7sXadBdoH17mfxlvX0geDD20CGiwlZb2P0hLFUmEdeO3W75BFM/r8ULbTYzj8UdJlfl6d4/4LUvqFGAzL8vmjEAn6oxPgWjvX38qSf0PXX+mckSy4Xs/S2nhO4TSfedluGHPZblzS8P8b+YggzsI1LBhvayxdsidDEUgszmqhmFkL3ItNUZ7An4kaJUoaXsT8O0PCVO5SGpdfOsjw5cYMKzUJhzR9Kvz1MKL+4yRwuomcFDUlD6vQYS5E0QKBgQD5UBgR9UiMO/NGqFi29z2tKTCsZ9O9A94IStcrRFr2nzvMLG+We7GaDYtKKcp1bdWnmVN7R6OGkm2A3JK9dKfGZ2eZIMLP3wm4xWzklnPHBeJtNBoQUy6m6ZRuVUGON78MDYJ1yV2O2yKExEipOYrABGOwrrEYRipvqD7QmTRt+wKBgQDT1kvKXZfcjp+/nzNcXFsCBX7NUiRKgerJL5lDCiWV78IhXyTybI5vndeWtOWPccCwRAEaUGjBDDxN/o62HnDToCA6CuSO3jKETDx0sKaectLJoJIR0fJav43BZCN/yz2IpFx5337+KEohj+fwO0dtlMuqlwcrGFVN8Y9CQVi4lQKBgDELDHEb6zWK5YRUwX7cjAlwPN7tXb2k8Rx4fHNKcwposH6tjxXvJzTCzU+9gNIw1QKvKrjpksV6MIhU25jhRc/Fr59zzl7N5T+vtogRAJ16Dtykjyv+8QJsmIJLyyWK2c4pKiy5e+oKOXQcmJ6RbzXupx2uf6/ivZ5RXmnyeVnZAoGAfuAWvLmZvwvdOhPL20GlcGyCKc9M1SNC0ASmMrTdFhRnnT0zD89c8BUFjsoBxAxJcEkKsAwA8b62T7BrIUDSKq35H0pu4fLLJtnSS8GRyczT2tdFJU8tbJTV/kJP0LaVwEVQ7d2iXe8bl0ZtkECw4zz/TsjuDi2gyfIn73LcBJECgYAoWcd2MNH7NdIyYeHkePcmxKVUvMstkuSDjbabEKbLEvtnjN1HG3sZ2M+owODYAVcEzZr20w9nsRsPSEa5Lqra2Ymq0oDvZkEuBJv8M6QMOKzY0o8yuWgm/S9fY6+toQA8QNaC/8Ojl0CL/TVMAE6Ri/DpCyvr54Gsm8fiRDSsww==-----END PRIVATE KEY-----';

const certificate =
	'-----BEGIN CERTIFICATE-----MIICqDCCAZACCQCCBsk1456fOjANBgkqhkiG9w0BAQsFADAWMRQwEgYDVQQDDAtlbnQxMDAtdGVzdDAeFw0yNjA2MjQxMjM2NDZaFw0zNjA2MjExMjM2NDZaMBYxFDASBgNVBAMMC2VudDEwMC10ZXN0MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAzk22mneUFQrjV/+iSCDDe5sItyO8OjyKGSfT2paxZbPoYP/d3D7qqoxbaQRbd0CTjQE3WNQh1hxMQGL+UJF2n+9GH9QfM5LloJHALmAWkUAJUjNL91UcwWcGielXBgfEOqpbpGrwMuz2rgBwF4LG1n8EIk37T9iV4qlua6tFELoPT/Hoaci+UuFQj4IJRXtV6VgH0rj1eUCaQwjf7ZxEWi+X9V8DeeZepSf7ADf0uKIkXM4GdYB19SLvMo9pZaYFW2YGZwaailm6skNVwOBFLJ8A57jvxGwKcs8d0S1Qfzy3dgWR3xuxeBiMu19w4i9N7/0UNC5MM99J7AcvY9hrFwIDAQABMA0GCSqGSIb3DQEBCwUAA4IBAQC/Ke/e7fK0OT7/JBMfwj81stZ5kRJ3S/nvdtlnA+htRSWt17crZRIta6gYUuEFl+sQquKDzXHL70eO4FzfHxAJ5HKgANvb1RIm5NeWxOHCvwIbbNRDbjlPJ6TulO2L29DK7N8U43EhbVLuJ16OQQsf5kN2OGBRCxBz4rzVywvus+TSLfmYHHGbgdyFkuNH6J7V+VrbefNPy/4BiTo2nj7hcdtdVNnrydJhniqUcrWJN4aiiyFQ6G4tum+EgcDAAdmSdY6EJhUYK6WAVoCHq5O97sYdSk0HeOwALnESSaVVksnGz/57h7cn+DK8zrrDbUCeq0L0Rc5i5mToAdSF4NQG-----END CERTIFICATE-----';

// SHA-1 (not SHA-256) thumbprint of `certificate`, base64url-encoded
const EXPECTED_X5T = 'aK3rs6ongTQ6RIYSBIx5LFJD-Q4';

function decodeSegment(segment: string) {
	// eslint-disable-next-line n8n-local-rules/no-uncaught-json-parse -- decoding a JWT segment we just produced
	return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8')) as Record<string, unknown>;
}

describe('buildClientAssertion', () => {
	it('signs an RS256 JWT with the x5t header and expected claims', () => {
		const assertion = buildClientAssertion({
			clientId,
			accessTokenUri,
			privateKey,
			certificate,
		});

		const [headerSeg, payloadSeg, signatureSeg] = assertion.split('.');
		const header = decodeSegment(headerSeg);
		const payload = decodeSegment(payloadSeg);

		expect(header).toMatchObject({ alg: 'RS256', typ: 'JWT', x5t: EXPECTED_X5T });
		expect(payload).toMatchObject({
			aud: accessTokenUri,
			iss: clientId,
			sub: clientId,
		});
		expect(payload.jti).toEqual(expect.any(String));
		expect(payload.exp as number).toBeGreaterThan(payload.iat as number);

		const verified = createVerify('RSA-SHA256')
			.update(`${headerSeg}.${payloadSeg}`)
			.verify(
				new X509Certificate(formatPemBlock(certificate)).publicKey,
				Buffer.from(signatureSeg, 'base64url'),
			);
		expect(verified).toBe(true);
	});

	it('throws a clear error when the certificate is not a valid X.509 certificate', () => {
		expect(() =>
			buildClientAssertion({
				clientId,
				accessTokenUri,
				privateKey,
				certificate: 'not-a-valid-certificate',
			}),
		).toThrow('The Certificate field must contain a PEM certificate');
	});

	it('throws a clear error when the private key is invalid', () => {
		expect(() =>
			buildClientAssertion({
				clientId,
				accessTokenUri,
				privateKey: 'not-a-valid-key',
				certificate,
			}),
		).toThrow('The Private Key field must contain a PEM private key');
	});

	it('throws a clear error when the certificate and private key fields are swapped', () => {
		expect(() =>
			buildClientAssertion({
				clientId,
				accessTokenUri,
				privateKey: certificate,
				certificate: privateKey,
			}),
		).toThrow('The Certificate field must contain a PEM certificate');
	});

	it('throws when a well-formed non-RSA (EC) private key is provided', () => {
		const { privateKey: ecPrivateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });

		expect(() =>
			buildClientAssertion({
				clientId,
				accessTokenUri,
				privateKey: ecPrivateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
				certificate,
			}),
		).toThrow('requires an RSA private key');
	});
});
