import type { Logger } from '@n8n/backend-common';
import type { DbLockService } from '@n8n/db';
import type { EntityManager } from '@n8n/typeorm';
import type { InstanceSettings } from 'n8n-core';
import { jsonParse } from 'n8n-workflow';
import { createHash } from 'node:crypto';
import { mock } from 'vitest-mock-extended';

import { TrustedKeySourceEntity } from '../../database/entities/trusted-key-source.entity';
import type { TrustedKeySourceRepository } from '../../database/repositories/trusted-key-source.repository';
import type { IdentitySubstrateConfig } from '../../identity-substrate.config';
import type { JwksResolverService } from '../jwks-resolver';
import { TrustedKeySyncService } from '../trusted-key-sync.service';

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

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

const mockLogger = mock<Logger>({ scoped: vi.fn().mockReturnThis() });

function createMocks({
	isLeader = true,
	trustedKeys = '',
	inboundSubjectClaim = '',
}: { isLeader?: boolean; trustedKeys?: string; inboundSubjectClaim?: string } = {}) {
	const config = mock<IdentitySubstrateConfig>({
		trustedKeys,
		keyRefreshIntervalSeconds: 300,
		inboundSubjectClaim,
	});
	const sourceRepo = mock<TrustedKeySourceRepository>();
	const instanceSettings = mock<InstanceSettings>({ isLeader });
	const dbLockService = mock<DbLockService>();
	const jwksResolverService = mock<JwksResolverService>();
	const tx = mock<EntityManager>();

	dbLockService.withLock.mockImplementation(
		async (_lockId: unknown, fn: (tx: EntityManager) => Promise<unknown>) => {
			return await fn(tx);
		},
	);

	sourceRepo.find.mockResolvedValue([]);

	const service = new TrustedKeySyncService(
		mockLogger,
		config,
		sourceRepo,
		instanceSettings,
		dbLockService,
		jwksResolverService,
	);

	return {
		service,
		config,
		sourceRepo,
		dbLockService,
		instanceSettings,
		tx,
	};
}

// ──────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────

describe('TrustedKeySyncService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('initialize', () => {
		it('should sync sources, refresh keys, and start refresh poller on the leader', async () => {
			const { service, dbLockService } = createMocks({ isLeader: true });
			const setIntervalSpy = vi.spyOn(global, 'setInterval');

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
			const setIntervalSpy = vi.spyOn(global, 'setInterval');

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
			const setIntervalSpy = vi.spyOn(global, 'setInterval');

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
			const setIntervalSpy = vi.spyOn(global, 'setInterval');

			service.startRefresh();

			expect(setIntervalSpy).toHaveBeenCalledTimes(1);
			expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 30_000);

			service.stopRefresh();
			setIntervalSpy.mockRestore();
		});

		it('should not create duplicate interval on repeated startRefresh calls', () => {
			const { service } = createMocks();
			const setIntervalSpy = vi.spyOn(global, 'setInterval');

			service.startRefresh();
			service.startRefresh();

			expect(setIntervalSpy).toHaveBeenCalledTimes(1);

			service.stopRefresh();
			setIntervalSpy.mockRestore();
		});

		it('should not start refresh if shutting down', () => {
			const { service } = createMocks();
			const setIntervalSpy = vi.spyOn(global, 'setInterval');

			service.shutdown();
			service.startRefresh();

			expect(setIntervalSpy).not.toHaveBeenCalled();

			setIntervalSpy.mockRestore();
		});

		it('should clear interval on leader stepdown', () => {
			const { service } = createMocks();
			const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

			service.startRefresh();
			service.stopRefresh();

			expect(clearIntervalSpy).toHaveBeenCalled();

			// Call again to verify idempotency — should not throw
			service.stopRefresh();

			clearIntervalSpy.mockRestore();
		});

		it('should stop refresh on shutdown', () => {
			const { service } = createMocks();
			const setIntervalSpy = vi.spyOn(global, 'setInterval');

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
			await vi.advanceTimersByTimeAsync(30_000);
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
			await vi.advanceTimersByTimeAsync(30_000);
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
			await vi.advanceTimersByTimeAsync(30_000);
			service.stopRefresh();

			expect(dbLockService.withLock).toHaveBeenCalled();
		});
	});

	describe('syncSourcesToDb orphan-delete scoping', () => {
		it('scopes the delete-all sweep to managedBy: env-config when no sources are configured', async () => {
			const { service, tx } = createMocks({ trustedKeys: '' });

			await service.initialize();

			expect(tx.delete).toHaveBeenCalledWith(TrustedKeySourceEntity, { managedBy: 'env-config' });
		});

		it('scopes the orphan sweep to managedBy: env-config when sources are configured', async () => {
			const trustedKeys = JSON.stringify([
				{
					type: 'static',
					kid: 'k1',
					algorithms: ['RS256'],
					key: RSA_PUBLIC_KEY,
					issuer: 'https://issuer.example.com',
				},
			]);
			const { service, tx } = createMocks({ trustedKeys });

			await service.initialize();

			expect(tx.delete).toHaveBeenCalledWith(
				TrustedKeySourceEntity,
				expect.objectContaining({ managedBy: 'env-config' }),
			);
		});
	});

	describe('registerSsoDerivedSource', () => {
		const issuer = 'https://idp.example.com';
		const jwksUri = 'https://idp.example.com/.well-known/jwks.json';

		it('creates a new sso-derived source when the issuer is not yet registered', async () => {
			const { service, tx, sourceRepo } = createMocks();
			tx.findOneBy.mockResolvedValueOnce(null);
			sourceRepo.findOneBy.mockResolvedValue(mock<TrustedKeySourceEntity>());

			await service.registerSsoDerivedSource(issuer, jwksUri);

			expect(tx.save).toHaveBeenCalledWith(
				TrustedKeySourceEntity,
				expect.objectContaining({ managedBy: 'sso-derived', issuer, type: 'jwks' }),
			);
		});

		it('rejects when another source already claims the issuer', async () => {
			const { service, tx } = createMocks();
			tx.findOneBy.mockResolvedValueOnce(
				Object.assign(new TrustedKeySourceEntity(), { id: 'a-different-id', issuer }),
			);

			await expect(service.registerSsoDerivedSource(issuer, jwksUri)).rejects.toThrow(
				/already registered/,
			);
			expect(tx.save).not.toHaveBeenCalled();
		});

		it('does not throw when re-registering the same issuer (idempotent upsert)', async () => {
			const { service, tx, sourceRepo } = createMocks();
			const sourceId = createHash('sha256').update(issuer).digest('hex').slice(0, 36);
			tx.findOneBy.mockResolvedValueOnce(
				Object.assign(new TrustedKeySourceEntity(), { id: sourceId, issuer }),
			);
			sourceRepo.findOneBy.mockResolvedValue(mock<TrustedKeySourceEntity>());

			await expect(service.registerSsoDerivedSource(issuer, jwksUri)).resolves.not.toThrow();
			expect(tx.save).toHaveBeenCalled();
		});

		it('includes subjectClaim from config.inboundSubjectClaim when set', async () => {
			const { service, tx, sourceRepo } = createMocks({ inboundSubjectClaim: 'uid' });
			tx.findOneBy.mockResolvedValueOnce(null);
			sourceRepo.findOneBy.mockResolvedValue(mock<TrustedKeySourceEntity>());

			await service.registerSsoDerivedSource(issuer, jwksUri);

			const [, saved] = tx.save.mock.calls[0] as [unknown, { config: string }];
			expect(jsonParse(saved.config)).toMatchObject({ subjectClaim: 'uid' });
		});

		it('omits subjectClaim when config.inboundSubjectClaim is empty', async () => {
			const { service, tx, sourceRepo } = createMocks({ inboundSubjectClaim: '' });
			tx.findOneBy.mockResolvedValueOnce(null);
			sourceRepo.findOneBy.mockResolvedValue(mock<TrustedKeySourceEntity>());

			await service.registerSsoDerivedSource(issuer, jwksUri);

			const [, saved] = tx.save.mock.calls[0] as [unknown, { config: string }];
			expect(jsonParse(saved.config)).not.toHaveProperty('subjectClaim');
		});
	});
});
