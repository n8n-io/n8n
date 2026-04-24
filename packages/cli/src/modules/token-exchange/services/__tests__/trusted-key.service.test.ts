import type { Logger } from '@n8n/backend-common';
import type { DbLockService } from '@n8n/db';
import type { EntityManager } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

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

const mockLogger = mock<Logger>({ scoped: jest.fn().mockReturnThis() });

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

function createMocks({ isLeader = true }: { isLeader?: boolean } = {}) {
	const config = mock<TokenExchangeConfig>({
		trustedKeys: '',
		keyRefreshIntervalSeconds: 300,
	});
	const sourceRepo = mock<TrustedKeySourceRepository>();
	const keyRepo = mock<TrustedKeyRepository>();
	const instanceSettings = mock<InstanceSettings>({ isLeader });
	const dbLockService = mock<DbLockService>();
	const jwksResolverService = mock<JwksResolverService>();

	dbLockService.withLock.mockImplementation(
		async (_lockId: unknown, fn: (tx: EntityManager) => Promise<unknown>) => {
			return await fn(mock<EntityManager>());
		},
	);

	sourceRepo.find.mockResolvedValue([]);

	const service = new TrustedKeyService(
		mockLogger,
		config,
		sourceRepo,
		keyRepo,
		instanceSettings,
		dbLockService,
		jwksResolverService,
	);

	return { service, keyRepo, sourceRepo, dbLockService, instanceSettings };
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
		it('should sync sources, refresh keys, and start refresh poller on the leader', async () => {
			const { service, dbLockService } = createMocks({ isLeader: true });
			const setIntervalSpy = jest.spyOn(global, 'setInterval');

			await service.initialize();

			// sync + refresh both run under the distributed lock
			expect(dbLockService.withLock).toHaveBeenCalled();
			// refresh poller started
			expect(setIntervalSpy).toHaveBeenCalledTimes(1);

			service.stopRefresh();
			setIntervalSpy.mockRestore();
		});

		it('should sync sources and refresh keys on followers without starting the refresh poller', async () => {
			const { service, dbLockService } = createMocks({ isLeader: false });
			const setIntervalSpy = jest.spyOn(global, 'setInterval');

			await service.initialize();

			// Followers MUST write sources and keys to DB at startup — this closes
			// the multi-main race where a follower could serve verification before
			// the leader had populated the table.
			expect(dbLockService.withLock).toHaveBeenCalled();
			// Periodic refresh is still leader-only
			expect(setIntervalSpy).not.toHaveBeenCalled();

			setIntervalSpy.mockRestore();
		});
	});

	describe('leader lifecycle', () => {
		it('should refresh keys and start the poller when a follower is elected leader', async () => {
			const { service, dbLockService } = createMocks({ isLeader: false });
			const setIntervalSpy = jest.spyOn(global, 'setInterval');

			await service.initialize();
			expect(setIntervalSpy).not.toHaveBeenCalled();

			await service.onLeaderTakeover();

			// Takeover should re-fetch from sources...
			expect(dbLockService.withLock).toHaveBeenCalled();
			// ...and start the periodic poller that was previously follower-suppressed.
			expect(setIntervalSpy).toHaveBeenCalledTimes(1);

			service.stopRefresh();
			setIntervalSpy.mockRestore();
		});

		it('should start refresh poll interval on leader takeover', () => {
			const { service } = createMocks();
			const setIntervalSpy = jest.spyOn(global, 'setInterval');

			service.startRefresh();

			expect(setIntervalSpy).toHaveBeenCalledTimes(1);
			expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 30_000);

			service.stopRefresh();
			setIntervalSpy.mockRestore();
		});

		it('should not create duplicate interval on repeated startRefresh calls', () => {
			const { service } = createMocks();
			const setIntervalSpy = jest.spyOn(global, 'setInterval');

			service.startRefresh();
			service.startRefresh();

			expect(setIntervalSpy).toHaveBeenCalledTimes(1);

			service.stopRefresh();
			setIntervalSpy.mockRestore();
		});

		it('should not start refresh if shutting down', () => {
			const { service } = createMocks();
			const setIntervalSpy = jest.spyOn(global, 'setInterval');

			service.shutdown();
			service.startRefresh();

			expect(setIntervalSpy).not.toHaveBeenCalled();

			setIntervalSpy.mockRestore();
		});

		it('should clear interval on leader stepdown', () => {
			const { service } = createMocks();
			const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

			service.startRefresh();
			service.stopRefresh();

			expect(clearIntervalSpy).toHaveBeenCalled();

			// Call again to verify idempotency — should not throw
			service.stopRefresh();

			clearIntervalSpy.mockRestore();
		});

		it('should stop refresh on shutdown', () => {
			const { service } = createMocks();
			const setIntervalSpy = jest.spyOn(global, 'setInterval');

			service.startRefresh();
			expect(setIntervalSpy).toHaveBeenCalledTimes(1);

			service.shutdown();
			service.startRefresh();

			// Still only 1 call — post-shutdown startRefresh is a no-op
			expect(setIntervalSpy).toHaveBeenCalledTimes(1);

			setIntervalSpy.mockRestore();
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

			service.startRefresh();
			await jest.advanceTimersByTimeAsync(30_000);
			service.stopRefresh();

			// Source was recently refreshed — should not trigger a refresh
			expect(dbLockService.withLock).not.toHaveBeenCalled();
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

			service.startRefresh();
			await jest.advanceTimersByTimeAsync(30_000);
			service.stopRefresh();

			expect(dbLockService.withLock).toHaveBeenCalled();
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

			service.startRefresh();
			await jest.advanceTimersByTimeAsync(30_000);
			service.stopRefresh();

			expect(dbLockService.withLock).toHaveBeenCalled();
		});
	});
});
