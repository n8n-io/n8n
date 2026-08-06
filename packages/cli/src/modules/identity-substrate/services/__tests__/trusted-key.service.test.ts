import type { Logger } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import { TrustedKeySourceEntity } from '../../database/entities/trusted-key-source.entity';
import { TrustedKeyEntity } from '../../database/entities/trusted-key.entity';
import type { TrustedKeySourceRepository } from '../../database/repositories/trusted-key-source.repository';
import type { TrustedKeyRepository } from '../../database/repositories/trusted-key.repository';
import type { TrustedKeyData } from '../../identity-substrate.schemas';
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

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

const mockLogger = mock<Logger>({ scoped: vi.fn().mockReturnThis() });

function makeTrustedKeyData(overrides: Partial<TrustedKeyData> = {}): TrustedKeyData {
	return {
		algorithms: ['RS256'],
		keyMaterial: RSA_PUBLIC_KEY,
		issuer: 'https://issuer.example.com',
		...overrides,
	};
}

function makeTrustedKeyEntity(
	overrides: Partial<{ sourceId: string; kid: string; data: TrustedKeyData }> = {},
): TrustedKeyEntity {
	const entity = new TrustedKeyEntity();
	entity.sourceId = overrides.sourceId ?? 'static';
	entity.kid = overrides.kid ?? 'test-kid';
	entity.data = JSON.stringify(overrides.data ?? makeTrustedKeyData());
	entity.createdAt = new Date();
	return entity;
}

function createMocks() {
	const sourceRepo = mock<TrustedKeySourceRepository>();
	const keyRepo = mock<TrustedKeyRepository>();

	const service = new TrustedKeyService(mockLogger, sourceRepo, keyRepo);

	return { service, keyRepo, sourceRepo };
}

// ──────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────

describe('TrustedKeyService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('crypto cache', () => {
		it('should reuse cached crypto key when keyMaterial is unchanged', async () => {
			const { service, keyRepo } = createMocks();

			const entity = makeTrustedKeyEntity();
			keyRepo.findAllByKid.mockResolvedValue([entity]);

			const result1 = await service.getByKidAndIss('test-kid', 'https://issuer.example.com');
			const result2 = await service.getByKidAndIss('test-kid', 'https://issuer.example.com');

			// Same KeyObject instance (from cache)
			expect(result1!.key).toBe(result2!.key);
		});

		it('should create new crypto key when keyMaterial changes', async () => {
			const { service, keyRepo } = createMocks();

			const entity1 = makeTrustedKeyEntity({
				data: makeTrustedKeyData({ keyMaterial: RSA_PUBLIC_KEY }),
			});
			keyRepo.findAllByKid.mockResolvedValueOnce([entity1]);

			const result1 = await service.getByKidAndIss('test-kid', 'https://issuer.example.com');

			// Change key material to EC key
			const entity2 = makeTrustedKeyEntity({
				data: makeTrustedKeyData({
					keyMaterial: EC_PUBLIC_KEY,
					algorithms: ['ES256'],
				}),
			});
			keyRepo.findAllByKid.mockResolvedValueOnce([entity2]);

			const result2 = await service.getByKidAndIss('test-kid', 'https://issuer.example.com');

			// Different KeyObject (cache miss due to hash mismatch)
			expect(result1!.key).not.toBe(result2!.key);
		});
	});

	describe('subjectClaim resolution', () => {
		it('defaults subjectClaim to sub when the stored data omits it', async () => {
			const { service, keyRepo } = createMocks();
			keyRepo.findAllByKid.mockResolvedValue([makeTrustedKeyEntity()]);

			const result = await service.getByKidAndIss('test-kid', 'https://issuer.example.com');

			expect(result!.subjectClaim).toBe('sub');
		});

		it('returns the configured subjectClaim when present in stored data', async () => {
			const { service, keyRepo } = createMocks();
			keyRepo.findAllByKid.mockResolvedValue([
				makeTrustedKeyEntity({ data: makeTrustedKeyData({ subjectClaim: 'uid' }) }),
			]);

			const result = await service.getByKidAndIss('test-kid', 'https://issuer.example.com');

			expect(result!.subjectClaim).toBe('uid');
		});
	});

	describe('isSsoIssuer', () => {
		it('returns true when a sso-derived source matches the issuer', async () => {
			const { service, sourceRepo } = createMocks();
			sourceRepo.findOne.mockResolvedValue(
				Object.assign(new TrustedKeySourceEntity(), { issuer: 'https://idp.example.com' }),
			);

			await expect(service.isSsoIssuer('https://idp.example.com')).resolves.toBe(true);
			expect(sourceRepo.findOne).toHaveBeenCalledWith({
				where: { issuer: 'https://idp.example.com', managedBy: 'sso-derived' },
			});
		});

		it('returns false when no sso-derived source matches the issuer', async () => {
			const { service, sourceRepo } = createMocks();
			sourceRepo.findOne.mockResolvedValue(null);

			await expect(service.isSsoIssuer('https://idp.example.com')).resolves.toBe(false);
		});
	});
});
