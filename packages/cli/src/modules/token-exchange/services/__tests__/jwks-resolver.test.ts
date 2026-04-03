import { generateKeyPairSync } from 'node:crypto';

import { OperationalError } from 'n8n-workflow';

import type { JwksKeySource } from '../../token-exchange.schemas';
import { resolveJwksKeys } from '../jwks-resolver';

// ──────────────────────────────────────────────────────────────────────
// Test key fixtures — generated once, reused across tests
// ──────────────────────────────────────────────────────────────────────

const rsaKeyPair = generateKeyPairSync('rsa', { modulusLength: 2048 });
const rsaJwk = rsaKeyPair.publicKey.export({ format: 'jwk' });

const ecKeyPair = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const ecJwk = ecKeyPair.publicKey.export({ format: 'jwk' });

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

describe('resolveJwksKeys', () => {
	describe('happy path', () => {
		it('should resolve RSA JWK with explicit alg', async () => {
			const fetcher = mockFetchResponse([{ ...rsaJwk, kid: 'rsa-1', alg: 'RS256', use: 'sig' }]);

			const result = await resolveJwksKeys(DEFAULT_SOURCE, { fetcher });

			expect(result.keys).toHaveLength(1);
			expect(result.keys[0].kid).toBe('rsa-1');
			expect(result.keys[0].algorithms).toEqual(['RS256']);
			expect(result.keys[0].issuer).toBe('https://idp.example.com');
			expect(result.keys[0].key).toBeDefined();
		});

		it('should infer ES256 from EC P-256 JWK without alg', async () => {
			const fetcher = mockFetchResponse([{ ...ecJwk, kid: 'ec-1' }]);

			const result = await resolveJwksKeys(DEFAULT_SOURCE, { fetcher });

			expect(result.keys).toHaveLength(1);
			expect(result.keys[0].kid).toBe('ec-1');
			expect(result.keys[0].algorithms).toEqual(['ES256']);
		});

		it('should resolve multiple keys from one JWKS', async () => {
			const fetcher = mockFetchResponse([
				{ ...rsaJwk, kid: 'rsa-1', alg: 'RS256' },
				{ ...ecJwk, kid: 'ec-1' },
			]);

			const result = await resolveJwksKeys(DEFAULT_SOURCE, { fetcher });

			expect(result.keys).toHaveLength(2);
			expect(result.keys.map((k) => k.kid)).toEqual(['rsa-1', 'ec-1']);
		});

		it('should resolve Ed25519 OKP JWK to EdDSA', async () => {
			const fetcher = mockFetchResponse([{ ...ed25519Jwk, kid: 'ed-1' }]);

			const result = await resolveJwksKeys(DEFAULT_SOURCE, { fetcher });

			expect(result.keys).toHaveLength(1);
			expect(result.keys[0].algorithms).toEqual(['EdDSA']);
		});

		it('should propagate expectedAudience and allowedRoles from source', async () => {
			const source: JwksKeySource = {
				...DEFAULT_SOURCE,
				expectedAudience: 'https://n8n.example.com',
				allowedRoles: ['admin'],
			};
			const fetcher = mockFetchResponse([{ ...rsaJwk, kid: 'rsa-1', alg: 'RS256' }]);

			const result = await resolveJwksKeys(source, { fetcher });

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

			const result = await resolveJwksKeys(DEFAULT_SOURCE, { fetcher });

			expect(result.keys).toHaveLength(1);
			expect(result.keys[0].kid).toBe('rsa-1');
		});

		it('should skip keys with use: enc', async () => {
			const fetcher = mockFetchResponse([
				{ ...rsaJwk, kid: 'enc-key', alg: 'RS256', use: 'enc' },
				{ ...rsaJwk, kid: 'sig-key', alg: 'RS256', use: 'sig' },
			]);

			const result = await resolveJwksKeys(DEFAULT_SOURCE, { fetcher });

			expect(result.keys).toHaveLength(1);
			expect(result.keys[0].kid).toBe('sig-key');
		});

		it('should skip symmetric keys (kty: oct)', async () => {
			const fetcher = mockFetchResponse([
				{ kid: 'hmac-key', kty: 'oct', alg: 'HS256', k: 'c2VjcmV0' },
				{ ...rsaJwk, kid: 'rsa-1', alg: 'RS256' },
			]);

			const result = await resolveJwksKeys(DEFAULT_SOURCE, { fetcher });

			expect(result.keys).toHaveLength(1);
			expect(result.keys[0].kid).toBe('rsa-1');
		});

		it('should include keys with use: sig and keys without use field', async () => {
			const fetcher = mockFetchResponse([
				{ ...rsaJwk, kid: 'explicit-sig', alg: 'RS256', use: 'sig' },
				{ ...ecJwk, kid: 'no-use' }, // no use field — included
			]);

			const result = await resolveJwksKeys(DEFAULT_SOURCE, { fetcher });

			expect(result.keys).toHaveLength(2);
			expect(result.keys.map((k) => k.kid)).toEqual(['explicit-sig', 'no-use']);
		});
	});

	describe('TTL / Cache-Control', () => {
		it('should parse Cache-Control max-age for expiresAt', async () => {
			const fetcher = mockFetchResponse([{ ...rsaJwk, kid: 'rsa-1', alg: 'RS256' }], {
				cacheControl: 'public, max-age=600',
			});
			const before = Date.now();

			const result = await resolveJwksKeys(DEFAULT_SOURCE, { fetcher });

			const after = Date.now();
			const expectedMin = before + 600 * 1000;
			const expectedMax = after + 600 * 1000;
			expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMin);
			expect(result.expiresAt.getTime()).toBeLessThanOrEqual(expectedMax);
		});

		it('should fall back to source cacheTtlSeconds when no Cache-Control', async () => {
			const source: JwksKeySource = { ...DEFAULT_SOURCE, cacheTtlSeconds: 120 };
			const fetcher = mockFetchResponse([{ ...rsaJwk, kid: 'rsa-1', alg: 'RS256' }]);
			const before = Date.now();

			const result = await resolveJwksKeys(source, { fetcher });

			const expectedMin = before + 120 * 1000;
			expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMin);
		});

		it('should fall back to default TTL (3600s) when no Cache-Control and no cacheTtlSeconds', async () => {
			const fetcher = mockFetchResponse([{ ...rsaJwk, kid: 'rsa-1', alg: 'RS256' }]);
			const before = Date.now();

			const result = await resolveJwksKeys(DEFAULT_SOURCE, { fetcher });

			const expectedMin = before + 3600 * 1000;
			expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMin);
		});
	});

	describe('error handling', () => {
		it('should throw OperationalError on network failure', async () => {
			const fetcher = mockFetchError(new Error('ECONNREFUSED'));

			await expect(resolveJwksKeys(DEFAULT_SOURCE, { fetcher })).rejects.toThrow(OperationalError);
			await expect(resolveJwksKeys(DEFAULT_SOURCE, { fetcher })).rejects.toThrow(
				/JWKS fetch failed.*ECONNREFUSED/,
			);
		});

		it('should throw OperationalError on non-200 response', async () => {
			const fetcher = mockFetchResponse([], { status: 500 });

			await expect(resolveJwksKeys(DEFAULT_SOURCE, { fetcher })).rejects.toThrow(OperationalError);
			await expect(resolveJwksKeys(DEFAULT_SOURCE, { fetcher })).rejects.toThrow(/HTTP 500/);
		});

		it('should throw OperationalError on invalid JSON', async () => {
			const fetcher = mockFetchInvalidJson();

			await expect(resolveJwksKeys(DEFAULT_SOURCE, { fetcher })).rejects.toThrow(OperationalError);
			await expect(resolveJwksKeys(DEFAULT_SOURCE, { fetcher })).rejects.toThrow(/not valid JSON/);
		});

		it('should throw OperationalError on empty keys array', async () => {
			const fetcher = mockFetchResponse([]);

			await expect(resolveJwksKeys(DEFAULT_SOURCE, { fetcher })).rejects.toThrow(OperationalError);
			await expect(resolveJwksKeys(DEFAULT_SOURCE, { fetcher })).rejects.toThrow(/no keys/);
		});

		it('should throw OperationalError when all keys are filtered out', async () => {
			const fetcher = mockFetchResponse([{ kid: 'enc-only', kty: 'RSA', use: 'enc', ...rsaJwk }]);

			await expect(resolveJwksKeys(DEFAULT_SOURCE, { fetcher })).rejects.toThrow(OperationalError);
			await expect(resolveJwksKeys(DEFAULT_SOURCE, { fetcher })).rejects.toThrow(
				/no usable signing keys/,
			);
		});
	});

	describe('edge cases', () => {
		it('should skip keys with unrecognized kty/crv and return valid keys', async () => {
			const fetcher = mockFetchResponse([
				{ kid: 'unknown-curve', kty: 'EC', crv: 'brainpoolP256r1', x: 'x', y: 'y' },
				{ ...rsaJwk, kid: 'rsa-1', alg: 'RS256' },
			]);

			const result = await resolveJwksKeys(DEFAULT_SOURCE, { fetcher });

			expect(result.keys).toHaveLength(1);
			expect(result.keys[0].kid).toBe('rsa-1');
		});

		it('should skip keys that fail createPublicKey and return valid keys', async () => {
			const fetcher = mockFetchResponse([
				{ kid: 'bad-key', kty: 'EC', crv: 'P-256', x: '!!!', y: '!!!' },
				{ ...rsaJwk, kid: 'rsa-1', alg: 'RS256' },
			]);

			const result = await resolveJwksKeys(DEFAULT_SOURCE, { fetcher });

			expect(result.keys).toHaveLength(1);
			expect(result.keys[0].kid).toBe('rsa-1');
		});
	});
});
