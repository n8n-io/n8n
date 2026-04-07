import type { Logger } from '@n8n/backend-common';
import { mock } from 'jest-mock-extended';

import type { TokenExchangeConfig } from '../../token-exchange.config';
import { TrustedKeyService } from '../trusted-key.service';

// ──────────────────────────────────────────────────────────────────────
// Pre-generated PEM public keys (test-only, no secrets)
// ──────────────────────────────────────────────────────────────────────

const RSA_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1A5I3JA3ylWxNFZcNqp9
qo3dhhO/7wAKUVH73Ryc/UWeHQPon5K+cVchPG2td4yg9llV6LDqurdI5wO1b1tg
XZjky3Brbh6LISZNjQJr0YvhCVW7NU6jjqgrLqNVrPeAGP51h9ozSIHUm1UyWm2J
wquhuvVhFlgaeHwA5HtBrYuwihEHJBJueIn9CiGYGwTModwT+WrhK5SxuXhtkD9w
6SJrbXZIdOnTtAFxH0bn+OYriRD7SgEn5UWiVpXyaRNkKhiFpozK2U1MqtKLrWgC
o6LNz3KqejtBEOT+/IbnbgIShhWcTuh8Ehw0EUtkOXdqykqoXuEtcoLj3c4efQ/n
dQIDAQAB
-----END PUBLIC KEY-----`;

const EC_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEpCuPN2BHQ7G0A2qD2Bd27bwwUB9M
Npzv5WS/ygt55l8y2X+Vfm5TQFRMNkqEx+/GXaPIU/hDmtnBdCxAUIRM9g==
-----END PUBLIC KEY-----`;

const ED25519_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAPBUxurC3wGyi/yXTTjNwTzgHjSioAIa4Qx6nyOqof0U=
-----END PUBLIC KEY-----`;

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

const mockLogger = mock<Logger>({ scoped: jest.fn().mockReturnThis() });

function createService(trustedKeysJson: string): TrustedKeyService {
	const tokenExchangeConfig = mock<TokenExchangeConfig>({
		trustedKeys: trustedKeysJson,
		enabled: true,
	});
	return new TrustedKeyService(mockLogger, tokenExchangeConfig);
}

function staticKeyEntry(
	overrides: Partial<{
		kid: string;
		algorithms: string[];
		key: string;
		issuer: string;
		expectedAudience: string;
		allowedRoles: string[];
	}> = {},
) {
	return {
		type: 'static' as const,
		kid: 'test-kid',
		algorithms: ['RS256'],
		key: RSA_PUBLIC_KEY,
		issuer: 'https://issuer.example.com',
		...overrides,
	};
}

async function initWithEntries(entries: unknown[]): Promise<TrustedKeyService> {
	const service = createService(JSON.stringify(entries));
	await service.initialize();
	return service;
}

// ──────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────

describe('TrustedKeyService', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('configuration loading', () => {
		it('should load keys from trustedKeys config', async () => {
			const service = await initWithEntries([staticKeyEntry()]);
			expect(service.size).toBe(1);
		});

		it('should succeed with empty config', async () => {
			const service = createService('');
			await service.initialize();
			expect(service.size).toBe(0);
		});

		it('should throw on invalid JSON', async () => {
			const service = createService('not-json');
			await expect(service.initialize()).rejects.toThrow('Failed to parse trusted keys JSON');
		});

		it('should throw when parsed value is not an array', async () => {
			const service = createService(JSON.stringify({ type: 'static' }));
			await expect(service.initialize()).rejects.toThrow();
		});
	});

	describe('algorithm validation', () => {
		it('should reject none algorithm', async () => {
			// 'none' is not in JwtAlgorithmSchema, so Zod rejects it at parse time
			await expect(
				initWithEntries([staticKeyEntry({ algorithms: ['none' as 'RS256'] })]),
			).rejects.toThrow();
		});

		it.each(['HS256', 'HS384', 'HS512'])('should reject HMAC algorithm %s', async (alg) => {
			await expect(
				initWithEntries([staticKeyEntry({ algorithms: [alg as 'RS256'] })]),
			).rejects.toThrow();
		});

		it('should reject unknown algorithm', async () => {
			await expect(
				initWithEntries([staticKeyEntry({ algorithms: ['FAKE256' as 'RS256'] })]),
			).rejects.toThrow();
		});

		it('should reject cross-family mixing (RS256 + ES256)', async () => {
			await expect(
				initWithEntries([staticKeyEntry({ algorithms: ['RS256', 'ES256'], key: RSA_PUBLIC_KEY })]),
			).rejects.toThrow('same family');
		});

		it('should accept multiple same-family algorithms (RS256 + PS256)', async () => {
			const service = await initWithEntries([
				staticKeyEntry({ algorithms: ['RS256', 'PS256'], key: RSA_PUBLIC_KEY }),
			]);
			expect(service.size).toBe(1);
		});
	});

	describe('key-algorithm compatibility', () => {
		it('should accept RSA key with RS256', async () => {
			const service = await initWithEntries([
				staticKeyEntry({ kid: 'rsa-key', algorithms: ['RS256'], key: RSA_PUBLIC_KEY }),
			]);
			expect(service.size).toBe(1);
		});

		it('should accept EC key with ES256', async () => {
			const service = await initWithEntries([
				staticKeyEntry({ kid: 'ec-key', algorithms: ['ES256'], key: EC_PUBLIC_KEY }),
			]);
			expect(service.size).toBe(1);
		});

		it('should accept Ed25519 key with EdDSA', async () => {
			const service = await initWithEntries([
				staticKeyEntry({
					kid: 'ed-key',
					algorithms: ['EdDSA'],
					key: ED25519_PUBLIC_KEY,
				}),
			]);
			expect(service.size).toBe(1);
		});

		it('should reject EC key with RSA algorithm', async () => {
			await expect(
				initWithEntries([
					staticKeyEntry({ kid: 'ec-rsa', algorithms: ['RS256'], key: EC_PUBLIC_KEY }),
				]),
			).rejects.toThrow('does not match algorithm family');
		});

		it('should reject RSA key with EC algorithm', async () => {
			await expect(
				initWithEntries([
					staticKeyEntry({ kid: 'rsa-ec', algorithms: ['ES256'], key: RSA_PUBLIC_KEY }),
				]),
			).rejects.toThrow('does not match algorithm family');
		});

		it('should reject invalid PEM string', async () => {
			await expect(
				initWithEntries([
					staticKeyEntry({ kid: 'bad-pem', algorithms: ['RS256'], key: 'not-a-pem' }),
				]),
			).rejects.toThrow('failed to parse public key');
		});
	});

	describe('duplicate detection', () => {
		it('should reject duplicate kid values', async () => {
			await expect(
				initWithEntries([
					staticKeyEntry({ kid: 'same-kid', key: RSA_PUBLIC_KEY }),
					staticKeyEntry({ kid: 'same-kid', key: RSA_PUBLIC_KEY }),
				]),
			).rejects.toThrow('duplicate kid');
		});
	});

	describe('JWKS handling', () => {
		it('should log warning and skip JWKS sources', async () => {
			const service = await initWithEntries([
				{
					type: 'jwks',
					url: 'https://example.com/.well-known/jwks.json',
					issuer: 'https://example.com',
				},
			]);
			expect(service.size).toBe(0);
			expect(mockLogger.warn).toHaveBeenCalledWith(
				expect.stringContaining('JWKS key sources are not yet supported'),
			);
		});

		it('should load static keys alongside skipped JWKS sources', async () => {
			const service = await initWithEntries([
				staticKeyEntry({ kid: 'static-1' }),
				{
					type: 'jwks',
					url: 'https://example.com/.well-known/jwks.json',
					issuer: 'https://example.com',
				},
			]);
			expect(service.size).toBe(1);
			expect(await service.getByKid('static-1')).toBeDefined();
		});
	});

	describe('getByKid', () => {
		it('should return correct ResolvedTrustedKey for known kid', async () => {
			const service = await initWithEntries([
				staticKeyEntry({
					kid: 'my-key',
					algorithms: ['RS256'],
					key: RSA_PUBLIC_KEY,
					issuer: 'https://issuer.example.com',
				}),
			]);

			const result = await service.getByKid('my-key');
			expect(result).toBeDefined();
			expect(result!.kid).toBe('my-key');
			expect(result!.algorithms).toEqual(['RS256']);
			expect(result!.issuer).toBe('https://issuer.example.com');
			expect(result!.key).toBeDefined();
		});

		it('should return undefined for unknown kid', async () => {
			const service = await initWithEntries([staticKeyEntry({ kid: 'known' })]);
			const result = await service.getByKid('unknown');
			expect(result).toBeUndefined();
		});
	});
});
