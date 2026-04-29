import { generateKeyPairSync } from 'node:crypto';

import type { Logger } from '@n8n/backend-common';
import { mock } from 'jest-mock-extended';
import { OperationalError } from 'n8n-workflow';

import type { JwksKeySource } from '../../token-exchange.schemas';
import { JwksResolverService } from '../jwks-resolver';

// ──────────────────────────────────────────────────────────────────────
// Test key fixtures — generated once, reused across tests
// ──────────────────────────────────────────────────────────────────────

const rsaKeyPair = generateKeyPairSync('rsa', { modulusLength: 2048 });
const rsaJwk = rsaKeyPair.publicKey.export({ format: 'jwk' });

const ecKeyPair = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const ecJwk = ecKeyPair.publicKey.export({ format: 'jwk' });

const ecP384KeyPair = generateKeyPairSync('ec', { namedCurve: 'P-384' });
const ecP384Jwk = ecP384KeyPair.publicKey.export({ format: 'jwk' });

const ecP521KeyPair = generateKeyPairSync('ec', { namedCurve: 'P-521' });
const ecP521Jwk = ecP521KeyPair.publicKey.export({ format: 'jwk' });

const ed25519KeyPair = generateKeyPairSync('ed25519');
const ed25519Jwk = ed25519KeyPair.publicKey.export({ format: 'jwk' });

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

const DEFAULT_SOURCE: JwksKeySource = {
	type: 'jwks',
	url: 'https://idp.example.com/.well-known/jwks.json',
	issuer: 'https://idp.example.com',
};

function mockFetchResponse(
	keys: unknown[],
	options?: { status?: number; cacheControl?: string },
): typeof fetch {
	const status = options?.status ?? 200;
	const headers = new Headers();
	if (options?.cacheControl) {
		headers.set('cache-control', options.cacheControl);
	}
	return jest.fn().mockResolvedValue({
		ok: status >= 200 && status < 300,
		status,
		headers,
		json: async () => ({ keys }),
	});
}

function mockFetchError(error: Error): typeof fetch {
	return jest.fn().mockRejectedValue(error);
}

function mockFetchInvalidJson(): typeof fetch {
	return jest.fn().mockResolvedValue({
		ok: true,
		status: 200,
		headers: new Headers(),
		json: async () => {
			throw new SyntaxError('Unexpected token');
		},
	});
}

// ──────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────

const mockLogger = mock<Logger>({ scoped: jest.fn().mockReturnThis() });

describe('JwksResolverService', () => {
	let service: JwksResolverService;

	beforeEach(() => {
		service = new JwksResolverService(mockLogger);
	});

	describe('happy path', () => {
		it('should resolve RSA JWK with explicit alg', async () => {
			const fetcher = mockFetchResponse([{ ...rsaJwk, kid: 'rsa-1', alg: 'RS256', use: 'sig' }]);

			const result = await service.resolveKeys(DEFAULT_SOURCE, { fetcher });

			expect(result.keys).toHaveLength(1);
			expect(result.keys[0].kid).toBe('rsa-1');
			expect(result.keys[0].algorithms).toEqual(['RS256']);
			expect(result.keys[0].issuer).toBe('https://idp.example.com');
			expect(result.keys[0].keyMaterial).toContain('BEGIN PUBLIC KEY');
		});

		it('should infer ES256 from EC P-256 JWK without alg', async () => {
			const fetcher = mockFetchResponse([{ ...ecJwk, kid: 'ec-1' }]);

			const result = await service.resolveKeys(DEFAULT_SOURCE, { fetcher });

			expect(result.keys).toHaveLength(1);
			expect(result.keys[0].kid).toBe('ec-1');
			expect(result.keys[0].algorithms).toEqual(['ES256']);
		});

		it('should resolve multiple keys from one JWKS', async () => {
			const fetcher = mockFetchResponse([
				{ ...rsaJwk, kid: 'rsa-1', alg: 'RS256' },
				{ ...ecJwk, kid: 'ec-1' },
			]);

			const result = await service.resolveKeys(DEFAULT_SOURCE, { fetcher });

			expect(result.keys).toHaveLength(2);
			expect(result.keys.map((k) => k.kid)).toEqual(['rsa-1', 'ec-1']);
		});

		it('should resolve Ed25519 OKP JWK to EdDSA', async () => {
			const fetcher = mockFetchResponse([{ ...ed25519Jwk, kid: 'ed-1' }]);

			const result = await service.resolveKeys(DEFAULT_SOURCE, { fetcher });

			expect(result.keys).toHaveLength(1);
			expect(result.keys[0].algorithms).toEqual(['EdDSA']);
		});

		it('should infer RS256 from RSA JWK without explicit alg', async () => {
			const fetcher = mockFetchResponse([{ ...rsaJwk, kid: 'rsa-no-alg' }]);

			const result = await service.resolveKeys(DEFAULT_SOURCE, { fetcher });

			expect(result.keys).toHaveLength(1);
			expect(result.keys[0].kid).toBe('rsa-no-alg');
			expect(result.keys[0].algorithms).toEqual(['RS256']);
		});

		it.each([
			{ curve: 'P-384', jwk: ecP384Jwk, expectedAlg: 'ES384' },
			{ curve: 'P-521', jwk: ecP521Jwk, expectedAlg: 'ES512' },
		])('should infer $expectedAlg from EC $curve JWK', async ({ jwk, expectedAlg }) => {
			const fetcher = mockFetchResponse([{ ...jwk, kid: 'ec-curve' }]);

			const result = await service.resolveKeys(DEFAULT_SOURCE, { fetcher });

			expect(result.keys).toHaveLength(1);
			expect(result.keys[0].algorithms).toEqual([expectedAlg]);
		});

		it('should propagate expectedAudience and allowedRoles from source', async () => {
			const source: JwksKeySource = {
				...DEFAULT_SOURCE,
				expectedAudience: 'https://n8n.example.com',
				allowedRoles: ['admin'],
			};
			const fetcher = mockFetchResponse([{ ...rsaJwk, kid: 'rsa-1', alg: 'RS256' }]);

			const result = await service.resolveKeys(source, { fetcher });

			expect(result.keys[0].expectedAudience).toBe('https://n8n.example.com');
			expect(result.keys[0].allowedRoles).toEqual(['admin']);
		});
	});

	describe('filtering', () => {
		it('should skip keys without kid', async () => {
			const fetcher = mockFetchResponse([
				{ ...rsaJwk, alg: 'RS256' }, // no kid
				{ ...rsaJwk, kid: 'rsa-1', alg: 'RS256' },
			]);

			const result = await service.resolveKeys(DEFAULT_SOURCE, { fetcher });

			expect(result.keys).toHaveLength(1);
			expect(result.keys[0].kid).toBe('rsa-1');
		});

		it('should skip keys with use: enc', async () => {
			const fetcher = mockFetchResponse([
				{ ...rsaJwk, kid: 'enc-key', alg: 'RS256', use: 'enc' },
				{ ...rsaJwk, kid: 'sig-key', alg: 'RS256', use: 'sig' },
			]);

			const result = await service.resolveKeys(DEFAULT_SOURCE, { fetcher });

			expect(result.keys).toHaveLength(1);
			expect(result.keys[0].kid).toBe('sig-key');
		});

		it('should skip symmetric keys (kty: oct)', async () => {
			const fetcher = mockFetchResponse([
				{ kid: 'hmac-key', kty: 'oct', alg: 'HS256', k: 'c2VjcmV0' },
				{ ...rsaJwk, kid: 'rsa-1', alg: 'RS256' },
			]);

			const result = await service.resolveKeys(DEFAULT_SOURCE, { fetcher });

			expect(result.keys).toHaveLength(1);
			expect(result.keys[0].kid).toBe('rsa-1');
		});

		it('should skip keys with unsupported explicit alg', async () => {
			const fetcher = mockFetchResponse([
				{ ...rsaJwk, kid: 'hmac-key', alg: 'HS256' },
				{ ...rsaJwk, kid: 'rsa-1', alg: 'RS256' },
			]);

			const result = await service.resolveKeys(DEFAULT_SOURCE, { fetcher });

			expect(result.keys).toHaveLength(1);
			expect(result.keys[0].kid).toBe('rsa-1');
			expect(result.skipped).toEqual(
				expect.arrayContaining([expect.objectContaining({ kid: 'hmac-key' })]),
			);
		});

		it('should include keys with use: sig and keys without use field', async () => {
			const fetcher = mockFetchResponse([
				{ ...rsaJwk, kid: 'explicit-sig', alg: 'RS256', use: 'sig' },
				{ ...ecJwk, kid: 'no-use' }, // no use field — included
			]);

			const result = await service.resolveKeys(DEFAULT_SOURCE, { fetcher });

			expect(result.keys).toHaveLength(2);
			expect(result.keys.map((k) => k.kid)).toEqual(['explicit-sig', 'no-use']);
		});
	});

	describe('TTL / Cache-Control', () => {
		it('should parse Cache-Control max-age into ttlSeconds', async () => {
			const fetcher = mockFetchResponse([{ ...rsaJwk, kid: 'rsa-1', alg: 'RS256' }], {
				cacheControl: 'public, max-age=600',
			});

			const result = await service.resolveKeys(DEFAULT_SOURCE, { fetcher });

			expect(result.ttlSeconds).toBe(600);
		});

		it('should fall back to source cacheTtlSeconds when no Cache-Control', async () => {
			const source: JwksKeySource = { ...DEFAULT_SOURCE, cacheTtlSeconds: 120 };
			const fetcher = mockFetchResponse([{ ...rsaJwk, kid: 'rsa-1', alg: 'RS256' }]);

			const result = await service.resolveKeys(source, { fetcher });

			expect(result.ttlSeconds).toBe(120);
		});

		it('should fall back to default TTL (3600s) when no Cache-Control and no cacheTtlSeconds', async () => {
			const fetcher = mockFetchResponse([{ ...rsaJwk, kid: 'rsa-1', alg: 'RS256' }]);

			const result = await service.resolveKeys(DEFAULT_SOURCE, { fetcher });

			expect(result.ttlSeconds).toBe(3600);
		});

		it('should clamp max-age=0 to minimum TTL (60s)', async () => {
			const fetcher = mockFetchResponse([{ ...rsaJwk, kid: 'rsa-1', alg: 'RS256' }], {
				cacheControl: 'max-age=0',
			});

			const result = await service.resolveKeys(DEFAULT_SOURCE, { fetcher });

			expect(result.ttlSeconds).toBe(60);
		});

		it('should clamp very large max-age to maximum TTL (86400s)', async () => {
			const fetcher = mockFetchResponse([{ ...rsaJwk, kid: 'rsa-1', alg: 'RS256' }], {
				cacheControl: 'max-age=999999999',
			});

			const result = await service.resolveKeys(DEFAULT_SOURCE, { fetcher });

			expect(result.ttlSeconds).toBe(86_400);
		});

		it('should prefer Cache-Control max-age over source cacheTtlSeconds', async () => {
			const source: JwksKeySource = { ...DEFAULT_SOURCE, cacheTtlSeconds: 120 };
			const fetcher = mockFetchResponse([{ ...rsaJwk, kid: 'rsa-1', alg: 'RS256' }], {
				cacheControl: 'max-age=600',
			});

			const result = await service.resolveKeys(source, { fetcher });

			expect(result.ttlSeconds).toBe(600);
		});

		it('should use custom defaultTtlSeconds when no Cache-Control and no cacheTtlSeconds', async () => {
			const fetcher = mockFetchResponse([{ ...rsaJwk, kid: 'rsa-1', alg: 'RS256' }]);

			const result = await service.resolveKeys(DEFAULT_SOURCE, {
				fetcher,
				defaultTtlSeconds: 300,
			});

			expect(result.ttlSeconds).toBe(300);
		});
	});

	describe('error handling', () => {
		it('should throw OperationalError on network failure', async () => {
			const fetcher = mockFetchError(new Error('ECONNREFUSED'));

			const error = await service.resolveKeys(DEFAULT_SOURCE, { fetcher }).catch((e) => e);
			expect(error).toBeInstanceOf(OperationalError);
			expect(error.message).toMatch(/JWKS fetch failed.*ECONNREFUSED/);
		});

		it('should throw OperationalError on non-200 response', async () => {
			const fetcher = mockFetchResponse([], { status: 500 });

			const error = await service.resolveKeys(DEFAULT_SOURCE, { fetcher }).catch((e) => e);
			expect(error).toBeInstanceOf(OperationalError);
			expect(error.message).toMatch(/HTTP 500/);
		});

		it('should throw OperationalError on invalid JSON', async () => {
			const fetcher = mockFetchInvalidJson();

			const error = await service.resolveKeys(DEFAULT_SOURCE, { fetcher }).catch((e) => e);
			expect(error).toBeInstanceOf(OperationalError);
			expect(error.message).toMatch(/not valid JSON/);
		});

		it('should throw OperationalError on empty keys array', async () => {
			const fetcher = mockFetchResponse([]);

			const error = await service.resolveKeys(DEFAULT_SOURCE, { fetcher }).catch((e) => e);
			expect(error).toBeInstanceOf(OperationalError);
			expect(error.message).toMatch(/no keys/);
		});

		it('should throw OperationalError when all keys are filtered out', async () => {
			const fetcher = mockFetchResponse([{ kid: 'enc-only', kty: 'RSA', use: 'enc', ...rsaJwk }]);

			const error = await service.resolveKeys(DEFAULT_SOURCE, { fetcher }).catch((e) => e);
			expect(error).toBeInstanceOf(OperationalError);
			expect(error.message).toMatch(/no usable signing keys/);
		});
	});

	describe('edge cases', () => {
		it('should skip null and non-object entries in keys array', async () => {
			const fetcher = mockFetchResponse([
				null,
				'not-an-object',
				42,
				{ ...rsaJwk, kid: 'rsa-1', alg: 'RS256' },
			]);

			const result = await service.resolveKeys(DEFAULT_SOURCE, { fetcher });

			expect(result.keys).toHaveLength(1);
			expect(result.keys[0].kid).toBe('rsa-1');
			expect(result.skipped).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ kid: undefined, reason: 'not an object' }),
				]),
			);
		});

		it('should skip keys with unrecognized kty/crv and return valid keys', async () => {
			const fetcher = mockFetchResponse([
				{ kid: 'unknown-curve', kty: 'EC', crv: 'brainpoolP256r1', x: 'x', y: 'y' },
				{ ...rsaJwk, kid: 'rsa-1', alg: 'RS256' },
			]);

			const result = await service.resolveKeys(DEFAULT_SOURCE, { fetcher });

			expect(result.keys).toHaveLength(1);
			expect(result.keys[0].kid).toBe('rsa-1');
		});

		it('should skip keys that fail createPublicKey and return valid keys', async () => {
			const fetcher = mockFetchResponse([
				{ kid: 'bad-key', kty: 'EC', crv: 'P-256', x: '!!!', y: '!!!' },
				{ ...rsaJwk, kid: 'rsa-1', alg: 'RS256' },
			]);

			const result = await service.resolveKeys(DEFAULT_SOURCE, { fetcher });

			expect(result.keys).toHaveLength(1);
			expect(result.keys[0].kid).toBe('rsa-1');
		});

		it('should return skipped key diagnostics alongside resolved keys', async () => {
			const fetcher = mockFetchResponse([
				{ ...rsaJwk, alg: 'RS256' }, // no kid → schema validation failure
				{ kid: 'unsupported', kty: 'EC', crv: 'brainpoolP256r1', x: 'x', y: 'y' }, // unsupported curve
				{ kid: 'bad-material', kty: 'EC', crv: 'P-256', x: '!!!', y: '!!!' }, // invalid key material
				{ ...rsaJwk, kid: 'rsa-1', alg: 'RS256' }, // valid
			]);

			const result = await service.resolveKeys(DEFAULT_SOURCE, { fetcher });

			expect(result.keys).toHaveLength(1);
			expect(result.skipped).toHaveLength(3);
			expect(result.skipped).toEqual([
				expect.objectContaining({ reason: 'failed schema validation' }),
				expect.objectContaining({
					kid: 'unsupported',
					reason: expect.stringContaining('unsupported algorithm'),
				}),
				expect.objectContaining({
					kid: 'bad-material',
					reason: expect.stringContaining('failed to create public key'),
				}),
			]);
		});

		it('should return empty skipped array when all keys are valid', async () => {
			const fetcher = mockFetchResponse([{ ...rsaJwk, kid: 'rsa-1', alg: 'RS256' }]);

			const result = await service.resolveKeys(DEFAULT_SOURCE, { fetcher });

			expect(result.keys).toHaveLength(1);
			expect(result.skipped).toEqual([]);
		});
	});
});
