import type { Logger } from '@n8n/backend-common';
import type { DbLockService } from '@n8n/db';
import type { EntityManager } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import { TrustedKeySourceEntity } from '../../database/entities/trusted-key-source.entity';
import { TrustedKeyEntity } from '../../database/entities/trusted-key.entity';
import type { TrustedKeySourceRepository } from '../../database/repositories/trusted-key-source.repository';
import type { TrustedKeyRepository } from '../../database/repositories/trusted-key.repository';
import type { TokenExchangeConfig } from '../../token-exchange.config';
import type { TrustedKeyData } from '../../token-exchange.schemas';
import type { JwksResolverService } from '../jwks-resolver';
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

function makeSource(overrides: Partial<TrustedKeySourceEntity> = {}): TrustedKeySourceEntity {
	return Object.assign(new TrustedKeySourceEntity(), {
		id: 'static',
		type: 'static' as const,
		config: JSON.stringify([]),
		status: 'pending' as const,
		lastError: null,
		lastRefreshedAt: null,
		...overrides,
	});
}

/** A source whose refresh fails, and another source that is due. */
function seedFailingAndDueSources(mocks: ReturnType<typeof createMocks>) {
	const failing = makeSource({
		id: 'jwks-1',
		type: 'jwks',
		config: JSON.stringify({ type: 'jwks', url: 'https://idp.example.com/jwks' }),
	});
	const due = makeSource({ id: 'static' });
	mocks.sourceRepo.find.mockResolvedValue([failing, due]);
	mocks.sourceRepo.refreshSource.mockRejectedValueOnce(new Error('jwks down'));
	return { failing, due };
}

function createMocks() {
	const config = mock<TokenExchangeConfig>({
		trustedKeys: '',
		keyRefreshIntervalSeconds: 300,
	});
	const sourceRepo = mock<TrustedKeySourceRepository>();
	const keyRepo = mock<TrustedKeyRepository>();
	const dbLockService = mock<DbLockService>();
	const jwksResolverService = mock<JwksResolverService>();

	dbLockService.withLock.mockImplementation(
		async (_lockId: unknown, fn: (tx: EntityManager) => Promise<unknown>) => {
			return await fn(mock<EntityManager>());
		},
	);

	dbLockService.withLockContext.mockImplementation(async (_lockId, fn) => await fn({}));
	sourceRepo.find.mockResolvedValue([]);

	const service = new TrustedKeyService(
		mockLogger,
		config,
		sourceRepo,
		keyRepo,
		dbLockService,
		jwksResolverService,
	);

	return { service, keyRepo, sourceRepo, dbLockService };
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

	describe('initialize', () => {
		it('should sync sources and refresh keys on every instance', async () => {
			const { service, dbLockService } = createMocks();

			await service.initialize();

			// Every main MUST write sources and keys to DB at startup — this closes
			// the multi-main race where a follower could serve verification before
			// the leader had populated the table. The periodic refresh thereafter
			// is the trusted-key-refresh system task.
			expect(dbLockService.withLock).toHaveBeenCalled();
		});
	});

	describe('onLeaderTakeover', () => {
		it('should refresh the remaining sources and resolve when one source fails', async () => {
			const mocks = createMocks();
			seedFailingAndDueSources(mocks);

			await mocks.service.onLeaderTakeover();

			expect(mocks.dbLockService.withLockContext).toHaveBeenCalledTimes(2);
			expect(mocks.sourceRepo.refreshSource).toHaveBeenCalledWith(
				'static',
				expect.any(Function),
				{},
			);
			expect(mockLogger.error).toHaveBeenCalledTimes(1);
		});

		it.each(['lock', 'write'] as const)(
			'should refresh the remaining sources after a %s failure',
			async (failureType) => {
				const { service, sourceRepo, dbLockService } = createMocks();
				const sources = [makeSource({ id: 'first' }), makeSource({ id: 'second' })];
				const error = new Error(`${failureType} failed`);
				sourceRepo.find.mockResolvedValue(sources);
				if (failureType === 'lock') {
					dbLockService.withLockContext.mockRejectedValueOnce(error);
				} else {
					sourceRepo.refreshSource.mockRejectedValueOnce(error);
				}

				await expect(service.onLeaderTakeover()).resolves.toBeUndefined();

				expect(sourceRepo.refreshSource).toHaveBeenCalledWith('second', expect.any(Function), {});
				expect(mockLogger.error).toHaveBeenCalledWith('Failed to refresh trusted key source', {
					sourceId: 'first',
					error,
				});
			},
		);

		it('should refresh keys from sources when a follower is elected leader', async () => {
			const { service, sourceRepo, dbLockService } = createMocks();

			const source = Object.assign(new TrustedKeySourceEntity(), {
				id: 'static',
				type: 'static' as const,
				config: JSON.stringify([]),
				status: 'healthy' as const,
				lastError: null,
				lastRefreshedAt: new Date(), // recency must not matter on takeover
			});
			sourceRepo.find.mockResolvedValue([source]);

			await service.onLeaderTakeover();

			expect(dbLockService.withLockContext).toHaveBeenCalled();
		});
	});

	describe('refreshDueSources', () => {
		it('should skip sources that were recently refreshed', async () => {
			const { service, sourceRepo, dbLockService } = createMocks();

			const recentSource = Object.assign(new TrustedKeySourceEntity(), {
				id: 'static',
				type: 'static' as const,
				config: JSON.stringify([]),
				status: 'healthy' as const,
				lastError: null,
				lastRefreshedAt: new Date(), // just refreshed
			});

			sourceRepo.find.mockResolvedValue([recentSource]);

			await service.refreshDueSources(new AbortController().signal);

			// Source was recently refreshed — should not trigger a refresh
			expect(dbLockService.withLockContext).not.toHaveBeenCalled();
		});

		it('should refresh sources whose lastRefreshedAt exceeds the interval', async () => {
			const { service, sourceRepo, dbLockService } = createMocks();

			const staleSource = Object.assign(new TrustedKeySourceEntity(), {
				id: 'static',
				type: 'static' as const,
				config: JSON.stringify([]),
				status: 'healthy' as const,
				lastError: null,
				lastRefreshedAt: new Date(Date.now() - 400_000), // 400s ago, interval is 300s
			});

			sourceRepo.find.mockResolvedValue([staleSource]);

			await service.refreshDueSources(new AbortController().signal);

			expect(dbLockService.withLockContext).toHaveBeenCalled();
		});

		it('should refresh sources that have never been refreshed', async () => {
			const { service, sourceRepo, dbLockService } = createMocks();

			const newSource = Object.assign(new TrustedKeySourceEntity(), {
				id: 'static',
				type: 'static' as const,
				config: JSON.stringify([]),
				status: 'pending' as const,
				lastError: null,
				lastRefreshedAt: null,
			});

			sourceRepo.find.mockResolvedValue([newSource]);

			await service.refreshDueSources(new AbortController().signal);

			expect(dbLockService.withLockContext).toHaveBeenCalled();
		});

		it('should reject with the source error and stop at the failed source', async () => {
			const mocks = createMocks();
			seedFailingAndDueSources(mocks);

			await expect(mocks.service.refreshDueSources(new AbortController().signal)).rejects.toThrow(
				'jwks down',
			);

			expect(mocks.dbLockService.withLockContext).toHaveBeenCalledTimes(1);
		});

		it('should try the least recently updated source first', async () => {
			const mocks = createMocks();

			await mocks.service.refreshDueSources(new AbortController().signal);

			expect(mocks.sourceRepo.find).toHaveBeenCalledWith({ order: { updatedAt: 'ASC' } });
		});

		it('should record a refresh failure after rollback and propagate the error', async () => {
			const mocks = createMocks();
			const { failing } = seedFailingAndDueSources(mocks);

			await expect(mocks.service.refreshDueSources(new AbortController().signal)).rejects.toThrow(
				'jwks down',
			);

			expect(mocks.sourceRepo.update).toHaveBeenCalledWith(failing.id, {
				status: 'error',
				lastError: 'jwks down',
			});
		});

		it('should record a lock failure and propagate the error', async () => {
			const mocks = createMocks();
			const { failing } = seedFailingAndDueSources(mocks);
			const error = new Error('lock failed');
			mocks.dbLockService.withLockContext.mockRejectedValueOnce(error);

			await expect(mocks.service.refreshDueSources(new AbortController().signal)).rejects.toBe(
				error,
			);

			expect(mocks.sourceRepo.refreshSource).not.toHaveBeenCalled();
			expect(mocks.sourceRepo.update).toHaveBeenCalledWith(failing.id, {
				status: 'error',
				lastError: 'lock failed',
			});
		});

		it('should reject when the sources cannot be loaded', async () => {
			const { service, sourceRepo } = createMocks();

			sourceRepo.find.mockRejectedValue(new Error('DB error'));

			await expect(service.refreshDueSources(new AbortController().signal)).rejects.toThrow(
				'DB error',
			);
		});

		it('should stop before the next source when the run is aborted', async () => {
			const { service, sourceRepo, dbLockService } = createMocks();
			const controller = new AbortController();

			const staleSource = (id: string) =>
				Object.assign(new TrustedKeySourceEntity(), {
					id,
					type: 'static' as const,
					config: JSON.stringify([]),
					status: 'healthy' as const,
					lastError: null,
					lastRefreshedAt: null,
				});
			sourceRepo.find.mockResolvedValue([staleSource('first'), staleSource('second')]);
			dbLockService.withLockContext.mockImplementation(async () => controller.abort());

			await service.refreshDueSources(controller.signal);

			expect(dbLockService.withLockContext).toHaveBeenCalledTimes(1);
		});
	});
});
