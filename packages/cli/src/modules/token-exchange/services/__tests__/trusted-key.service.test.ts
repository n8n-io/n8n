import type { Logger } from '@n8n/backend-common';
import type { DbLockService } from '@n8n/db';
import { DbLock } from '@n8n/db';
import type { EntityManager } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import type { TrustedKeySourceEntity } from '../../database/entities/trusted-key-source.entity';
import { TrustedKeyEntity } from '../../database/entities/trusted-key.entity';
import type { TrustedKeySourceRepository } from '../../database/repositories/trusted-key-source.repository';
import type { TrustedKeyRepository } from '../../database/repositories/trusted-key.repository';
import type { TokenExchangeConfig } from '../../token-exchange.config';
import type { TrustedKeyData } from '../../token-exchange.schemas';
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

function createMocks(opts: { isLeader?: boolean; trustedKeys?: string } = {}) {
	const config = mock<TokenExchangeConfig>({
		trustedKeys: opts.trustedKeys ?? '',
		keyRefreshIntervalSeconds: 300,
	});
	const sourceRepo = mock<TrustedKeySourceRepository>();
	const keyRepo = mock<TrustedKeyRepository>();
	const instanceSettings = mock<InstanceSettings>({ isLeader: opts.isLeader ?? true });
	const entityManager = mock<EntityManager>();
	const dbLockService = mock<DbLockService>();

	// DbLockService.withLock mock — executes the callback with the entityManager
	dbLockService.withLock.mockImplementation(
		async (_lockId: unknown, fn: (tx: EntityManager) => Promise<unknown>) => {
			return await fn(entityManager);
		},
	);

	// Default: no existing sources (clean state)
	sourceRepo.find.mockResolvedValue([]);
	// Default: no cross-source conflicts during refresh
	entityManager.findBy.mockResolvedValue([]);

	const service = new TrustedKeyService(
		mockLogger,
		config,
		sourceRepo,
		keyRepo,
		instanceSettings,
		dbLockService,
	);

	return { service, config, sourceRepo, keyRepo, instanceSettings, entityManager, dbLockService };
}

// ──────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────

describe('TrustedKeyService', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	describe('initialize', () => {
		describe('as leader', () => {
			it('should parse config, sync sources, refresh all, and start interval', async () => {
				const entries = [staticKeyEntry({ kid: 'key-1' })];
				const { service, sourceRepo, entityManager } = createMocks({
					isLeader: true,
					trustedKeys: JSON.stringify(entries),
				});

				// After syncSourcesToDb, refreshAllSources queries sources
				sourceRepo.find.mockResolvedValue([
					{
						id: 'static',
						type: 'static',
						config: JSON.stringify(entries),
						status: 'pending',
						lastError: null,
						lastRefreshedAt: null,
					} as TrustedKeySourceEntity,
				]);

				await service.initialize();

				// Source was synced to DB
				expect(sourceRepo.save).toHaveBeenCalledWith(
					expect.objectContaining({ id: 'static', type: 'static' }),
				);

				// Refresh used advisory lock
				expect(entityManager.delete).toHaveBeenCalled();
				expect(entityManager.save).toHaveBeenCalled();
				expect(entityManager.update).toHaveBeenCalledWith(
					expect.anything(),
					'static',
					expect.objectContaining({ status: 'healthy' }),
				);
			});

			it('should handle empty config', async () => {
				const { service, sourceRepo } = createMocks({ isLeader: true, trustedKeys: '' });

				await service.initialize();

				expect(sourceRepo.save).not.toHaveBeenCalled();
			});

			it('should throw on invalid JSON', async () => {
				const { service } = createMocks({ isLeader: true, trustedKeys: 'not-json' });

				await expect(service.initialize()).rejects.toThrow('Failed to parse trusted keys JSON');
			});

			it('should throw on invalid schema', async () => {
				const { service } = createMocks({
					isLeader: true,
					trustedKeys: JSON.stringify([{ type: 'invalid' }]),
				});

				await expect(service.initialize()).rejects.toThrow('Trusted keys JSON has invalid format');
			});

			it('should remove orphaned sources not in config', async () => {
				const { service, sourceRepo } = createMocks({
					isLeader: true,
					trustedKeys: JSON.stringify([staticKeyEntry()]),
				});

				// Existing orphaned source in DB
				sourceRepo.find.mockResolvedValueOnce([
					{ id: 'orphaned-source', type: 'jwks' } as TrustedKeySourceEntity,
				]);
				// For refreshAllSources
				sourceRepo.find.mockResolvedValueOnce([
					{
						id: 'static',
						type: 'static',
						config: JSON.stringify([staticKeyEntry()]),
						status: 'pending',
					} as TrustedKeySourceEntity,
				]);

				await service.initialize();

				expect(sourceRepo.delete).toHaveBeenCalledWith('orphaned-source');
			});

			it('should not remove UI sources during orphan cleanup', async () => {
				const { service, sourceRepo } = createMocks({
					isLeader: true,
					trustedKeys: JSON.stringify([staticKeyEntry()]),
				});

				sourceRepo.find.mockResolvedValueOnce([
					{ id: 'ui-source-uuid', type: 'ui' } as TrustedKeySourceEntity,
				]);
				sourceRepo.find.mockResolvedValueOnce([
					{
						id: 'static',
						type: 'static',
						config: JSON.stringify([staticKeyEntry()]),
						status: 'pending',
					} as TrustedKeySourceEntity,
				]);

				await service.initialize();

				expect(sourceRepo.delete).not.toHaveBeenCalledWith('ui-source-uuid');
			});
		});

		describe('as worker', () => {
			it('should not sync sources or start refresh', async () => {
				const { service, sourceRepo } = createMocks({
					isLeader: false,
					trustedKeys: JSON.stringify([staticKeyEntry()]),
				});

				await service.initialize();

				expect(sourceRepo.save).not.toHaveBeenCalled();
				expect(sourceRepo.find).not.toHaveBeenCalled();
			});
		});
	});

	describe('getByKidAndIss', () => {
		it('should return resolved key for matching kid and issuer', async () => {
			const { service, keyRepo } = createMocks();

			keyRepo.findAllByKid.mockResolvedValue([makeTrustedKeyEntity()]);

			const result = await service.getByKidAndIss('test-kid', 'https://issuer.example.com');

			expect(result).toBeDefined();
			expect(result!.kid).toBe('test-kid');
			expect(result!.algorithms).toEqual(['RS256']);
			expect(result!.issuer).toBe('https://issuer.example.com');
			expect(result!.key).toBeDefined();
		});

		it('should return undefined for unknown kid', async () => {
			const { service, keyRepo } = createMocks();

			keyRepo.findAllByKid.mockResolvedValue([]);

			const result = await service.getByKidAndIss('unknown', 'https://issuer.example.com');

			expect(result).toBeUndefined();
		});

		it('should return undefined when kid matches but issuer does not', async () => {
			const { service, keyRepo } = createMocks();

			keyRepo.findAllByKid.mockResolvedValue([makeTrustedKeyEntity()]);

			const result = await service.getByKidAndIss('test-kid', 'https://other-issuer.example.com');

			expect(result).toBeUndefined();
		});

		it('should select the entity matching the issuer from multiple results', async () => {
			const { service, keyRepo } = createMocks();

			keyRepo.findAllByKid.mockResolvedValue([
				makeTrustedKeyEntity({
					data: makeTrustedKeyData({ issuer: 'https://issuer-a.com' }),
				}),
				makeTrustedKeyEntity({
					data: makeTrustedKeyData({ issuer: 'https://issuer-b.com' }),
				}),
			]);

			const result = await service.getByKidAndIss('test-kid', 'https://issuer-b.com');

			expect(result).toBeDefined();
			expect(result!.issuer).toBe('https://issuer-b.com');
		});
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

	describe('refreshSourceInternal (via refreshSource)', () => {
		it('should execute transactional refresh for static source', async () => {
			const entries = [staticKeyEntry({ kid: 'key-1' })];
			const { service, sourceRepo, entityManager, dbLockService } = createMocks();

			sourceRepo.findOneBy.mockResolvedValue({
				id: 'static',
				type: 'static',
				config: JSON.stringify(entries),
				status: 'pending',
			} as TrustedKeySourceEntity);

			// No cross-source conflicts
			entityManager.findBy.mockResolvedValue([]);

			await service.refreshSource('static');

			// Advisory lock was used
			expect(dbLockService.withLock).toHaveBeenCalledWith(
				DbLock.TRUSTED_KEY_REFRESH,
				expect.any(Function),
			);

			// Old keys deleted
			expect(entityManager.delete).toHaveBeenCalledWith(TrustedKeyEntity, {
				sourceId: 'static',
			});

			// New key inserted
			expect(entityManager.save).toHaveBeenCalledWith(
				TrustedKeyEntity,
				expect.objectContaining({ sourceId: 'static', kid: 'key-1' }),
			);

			// Source marked healthy
			expect(entityManager.update).toHaveBeenCalledWith(
				expect.anything(),
				'static',
				expect.objectContaining({ status: 'healthy', lastError: null }),
			);
		});

		it('should mark source as error on failure and preserve existing keys', async () => {
			const { service, sourceRepo, dbLockService } = createMocks();

			sourceRepo.findOneBy.mockResolvedValue({
				id: 'static',
				type: 'static',
				config: 'invalid-json',
				status: 'healthy',
			} as TrustedKeySourceEntity);

			// Make the lock callback throw (simulating parse failure inside txn)
			dbLockService.withLock.mockRejectedValue(new Error('Unexpected token'));

			await service.refreshSource('static');

			// Source updated with error status (outside txn — keys preserved)
			expect(sourceRepo.update).toHaveBeenCalledWith('static', {
				status: 'error',
				lastError: 'Unexpected token',
				lastRefreshedAt: expect.any(Date),
			});
		});

		it('should throw when source not found', async () => {
			const { service, sourceRepo } = createMocks();
			sourceRepo.findOneBy.mockResolvedValue(null);

			await expect(service.refreshSource('nonexistent')).rejects.toThrow(
				'Trusted key source not found',
			);
		});

		it('should skip JWKS sources with warning', async () => {
			const { service, sourceRepo, entityManager } = createMocks();

			sourceRepo.findOneBy.mockResolvedValue({
				id: 'jwks-source',
				type: 'jwks',
				config: JSON.stringify({
					type: 'jwks',
					url: 'https://example.com/jwks',
					issuer: 'https://example.com',
				}),
				status: 'pending',
			} as TrustedKeySourceEntity);

			await service.refreshSource('jwks-source');

			expect(mockLogger.warn).toHaveBeenCalledWith(
				'JWKS key sources are not yet supported, skipping',
				expect.objectContaining({ sourceId: 'jwks-source' }),
			);
			expect(entityManager.save).not.toHaveBeenCalled();
		});

		it('should skip UI sources with warning', async () => {
			const { service, sourceRepo, entityManager } = createMocks();

			sourceRepo.findOneBy.mockResolvedValue({
				id: 'ui-source',
				type: 'ui',
				config: JSON.stringify({ type: 'ui' }),
				status: 'pending',
			} as TrustedKeySourceEntity);

			await service.refreshSource('ui-source');

			expect(mockLogger.warn).toHaveBeenCalledWith(
				'UI key sources are not yet supported, skipping',
				expect.objectContaining({ sourceId: 'ui-source' }),
			);
			expect(entityManager.save).not.toHaveBeenCalled();
		});
	});

	describe('kid conflict resolution', () => {
		it('should delete cross-source conflicts and log warning', async () => {
			const entries = [staticKeyEntry({ kid: 'conflicting-kid' })];
			const { service, sourceRepo, entityManager } = createMocks();

			sourceRepo.findOneBy.mockResolvedValue({
				id: 'static',
				type: 'static',
				config: JSON.stringify(entries),
				status: 'pending',
			} as TrustedKeySourceEntity);

			// Cross-source conflict: another source has the same kid
			entityManager.findBy.mockResolvedValue([
				{ sourceId: 'other-source', kid: 'conflicting-kid' } as TrustedKeyEntity,
			]);

			await service.refreshSource('static');

			// Warning logged about conflict
			expect(mockLogger.warn).toHaveBeenCalledWith(
				'Kid conflict: overwriting key from another source',
				expect.objectContaining({
					kid: 'conflicting-kid',
					existingSourceId: 'other-source',
					newSourceId: 'static',
				}),
			);

			// Conflicting keys deleted
			expect(entityManager.delete).toHaveBeenCalledWith(TrustedKeyEntity, {
				kid: 'conflicting-kid',
			});
		});
	});

	describe('algorithm validation (write path)', () => {
		it('should reject cross-family algorithm mixing', async () => {
			const entries = [
				staticKeyEntry({
					kid: 'mixed',
					algorithms: ['RS256', 'ES256'],
					key: RSA_PUBLIC_KEY,
				}),
			];
			const { service, sourceRepo } = createMocks();

			sourceRepo.findOneBy.mockResolvedValue({
				id: 'static',
				type: 'static',
				config: JSON.stringify(entries),
				status: 'pending',
			} as TrustedKeySourceEntity);

			await service.refreshSource('static');

			expect(sourceRepo.update).toHaveBeenCalledWith(
				'static',
				expect.objectContaining({ status: 'error' }),
			);
		});

		it('should reject EC key with RSA algorithm', async () => {
			const entries = [
				staticKeyEntry({ kid: 'ec-rsa', algorithms: ['RS256'], key: EC_PUBLIC_KEY }),
			];
			const { service, sourceRepo } = createMocks();

			sourceRepo.findOneBy.mockResolvedValue({
				id: 'static',
				type: 'static',
				config: JSON.stringify(entries),
				status: 'pending',
			} as TrustedKeySourceEntity);

			await service.refreshSource('static');

			expect(sourceRepo.update).toHaveBeenCalledWith(
				'static',
				expect.objectContaining({ status: 'error' }),
			);
		});

		it('should reject duplicate kid within same source', async () => {
			const entries = [staticKeyEntry({ kid: 'dup-kid' }), staticKeyEntry({ kid: 'dup-kid' })];
			const { service, sourceRepo } = createMocks();

			sourceRepo.findOneBy.mockResolvedValue({
				id: 'static',
				type: 'static',
				config: JSON.stringify(entries),
				status: 'pending',
			} as TrustedKeySourceEntity);

			await service.refreshSource('static');

			expect(sourceRepo.update).toHaveBeenCalledWith(
				'static',
				expect.objectContaining({ status: 'error' }),
			);
		});
	});

	describe('key-algorithm compatibility (write path)', () => {
		it.each([
			{ name: 'RSA key with RS256', kid: 'rsa-key', algorithms: ['RS256'], key: RSA_PUBLIC_KEY },
			{ name: 'EC key with ES256', kid: 'ec-key', algorithms: ['ES256'], key: EC_PUBLIC_KEY },
			{
				name: 'Ed25519 key with EdDSA',
				kid: 'ed-key',
				algorithms: ['EdDSA'],
				key: ED25519_PUBLIC_KEY,
			},
		])('should accept $name during refresh', async ({ kid, algorithms, key }) => {
			const entries = [staticKeyEntry({ kid, algorithms, key })];
			const { service, sourceRepo, entityManager } = createMocks();

			sourceRepo.findOneBy.mockResolvedValue({
				id: 'static',
				type: 'static',
				config: JSON.stringify(entries),
				status: 'pending',
			} as TrustedKeySourceEntity);
			entityManager.findBy.mockResolvedValue([]);

			await service.refreshSource('static');

			expect(entityManager.save).toHaveBeenCalledWith(
				TrustedKeyEntity,
				expect.objectContaining({ kid }),
			);
		});
	});

	describe('listAll', () => {
		it('should delegate to repository', async () => {
			const { service, keyRepo } = createMocks();
			const entities = [makeTrustedKeyEntity()];
			keyRepo.find.mockResolvedValue(entities);

			const result = await service.listAll();

			expect(result).toBe(entities);
		});
	});

	describe('listSources', () => {
		it('should delegate to repository', async () => {
			const { service, sourceRepo } = createMocks();
			const sources = [{ id: 'static', type: 'static' } as TrustedKeySourceEntity];
			sourceRepo.find.mockResolvedValue(sources);

			const result = await service.listSources();

			expect(result).toBe(sources);
		});
	});

	describe('leader lifecycle', () => {
		it('should start refresh interval on leader takeover', () => {
			const { service } = createMocks();

			service.startRefresh();

			// Verify interval was set (check that stopRefresh clears it)
			service.stopRefresh();
		});

		it('should not start refresh if shutting down', () => {
			const { service } = createMocks();

			service.shutdown();
			service.startRefresh();

			// No interval to clear — this just verifies no error thrown
			service.stopRefresh();
		});

		it('should clear interval on leader stepdown', () => {
			const { service } = createMocks();

			service.startRefresh();
			service.stopRefresh();

			// Call again to verify idempotency
			service.stopRefresh();
		});

		it('should stop refresh on shutdown', () => {
			const { service } = createMocks();

			service.startRefresh();
			service.shutdown();

			// Verify startRefresh after shutdown is a no-op
			service.startRefresh();
		});
	});
});
