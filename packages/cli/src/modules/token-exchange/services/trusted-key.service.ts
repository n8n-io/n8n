import { createHash, createPublicKey } from 'node:crypto';
import type { KeyObject } from 'node:crypto';

import { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import { DbLock, DbLockService } from '@n8n/db';
import { OnLeaderStepdown, OnLeaderTakeover, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import type { EntityManager } from '@n8n/typeorm';
import { In, Not } from '@n8n/typeorm';
import { InstanceSettings } from 'n8n-core';
import { UnexpectedError, jsonParse } from 'n8n-workflow';
import { z } from 'zod';

import { TrustedKeySourceEntity } from '../database/entities/trusted-key-source.entity';
import { TrustedKeyEntity } from '../database/entities/trusted-key.entity';
import { TrustedKeySourceRepository } from '../database/repositories/trusted-key-source.repository';
import { TrustedKeyRepository } from '../database/repositories/trusted-key.repository';
import { TokenExchangeConfig } from '../token-exchange.config';
import type {
	JwksKeySource,
	JwtAlgorithm,
	ResolvedTrustedKey,
	StaticKeySource,
	TrustedKeyData,
	TrustedKeySource,
} from '../token-exchange.schemas';
import { TrustedKeyDataSchema, TrustedKeySourceSchema } from '../token-exchange.schemas';
import { JwksResolverService } from './jwks-resolver';

type AlgorithmFamily = 'RSA' | 'EC' | 'EdDSA';

const ALGORITHM_FAMILY: Record<string, AlgorithmFamily> = {
	RS256: 'RSA',
	RS384: 'RSA',
	RS512: 'RSA',
	PS256: 'RSA',
	PS384: 'RSA',
	PS512: 'RSA',
	ES256: 'EC',
	ES384: 'EC',
	ES512: 'EC',
	EdDSA: 'EdDSA',
};

const STATIC_SOURCE_ID = 'static';

/** How often the leader polls sources to check if any are due for refresh. */
const REFRESH_POLL_INTERVAL_MS = 30 * Time.seconds.toMilliseconds;

/**
 * Manages trusted public keys for JWT signature verification.
 *
 * The leader resolves all configured key sources (env-var static keys,
 * future JWKS endpoints) and writes them to the database on startup and
 * on a periodic refresh interval. All instances read keys from the
 * database on every lookup, ensuring multi-instance consistency.
 *
 * A local crypto-primitive cache avoids repeated `createPublicKey()`
 * calls when the underlying key material has not changed.
 */
@Service()
export class TrustedKeyService {
	private readonly logger: Logger;

	private refreshInterval: NodeJS.Timeout | undefined;

	private isShuttingDown = false;

	private readonly cryptoCache = new Map<
		string,
		{ keyMaterialHash: string; cryptoKey: KeyObject }
	>();

	constructor(
		logger: Logger,
		private readonly config: TokenExchangeConfig,
		private readonly trustedKeySourceRepository: TrustedKeySourceRepository,
		private readonly trustedKeyRepository: TrustedKeyRepository,
		private readonly instanceSettings: InstanceSettings,
		private readonly dbLockService: DbLockService,
		private readonly jwksResolverService: JwksResolverService,
	) {
		this.logger = logger.scoped('token-exchange');
	}

	// ─── Public lifecycle ──────────────────────────────────────────────

	/**
	 * Leader: parse config → sync sources to DB → refresh all → start interval.
	 * Worker: no-op (reads from DB on demand via `getByKidAndIss`).
	 */
	async initialize(): Promise<void> {
		if (!this.instanceSettings.isLeader) {
			this.logger.debug('Worker instance — skipping trusted key initialization');
			return;
		}

		await this.initializeAsLeader();
	}

	@OnLeaderTakeover()
	async onLeaderTakeover() {
		await this.initializeAsLeader();
	}

	private async initializeAsLeader(): Promise<void> {
		const sources = this.parseConfigSources();
		await this.syncSourcesToDb(sources);
		await this.refreshAllSources();
		this.startRefresh();
	}

	startRefresh() {
		if (this.isShuttingDown || this.refreshInterval) return;

		this.refreshInterval = setInterval(
			async () => await this.refreshDueSources(),
			REFRESH_POLL_INTERVAL_MS,
		);

		this.logger.debug('Trusted key refresh poller started');
	}

	@OnLeaderStepdown()
	stopRefresh() {
		clearInterval(this.refreshInterval);
		this.refreshInterval = undefined;
	}

	@OnShutdown()
	shutdown() {
		this.isShuttingDown = true;
		this.stopRefresh();
	}

	// ─── Public read path ──────────────────────────────────────────────

	/**
	 * Look up a resolved trusted key by its `kid` and `issuer`.
	 *
	 * Queries the database on every call (no stale reads). The local
	 * crypto cache avoids repeated `createPublicKey()` calls when the
	 * key material has not changed.
	 */
	async getByKidAndIss(kid: string, issuer: string): Promise<ResolvedTrustedKey | undefined> {
		const entities = await this.trustedKeyRepository.findAllByKid(kid);
		if (entities.length === 0) return undefined;

		for (const entity of entities) {
			let data: TrustedKeyData;
			try {
				const parsed = TrustedKeyDataSchema.safeParse(JSON.parse(entity.data));
				if (!parsed.success) {
					this.logger.warn('Skipping corrupted trusted key entity', {
						kid,
						sourceId: entity.sourceId,
						error: parsed.error.message,
					});
					continue;
				}
				data = parsed.data;
			} catch {
				this.logger.warn('Skipping corrupted trusted key entity', {
					kid,
					sourceId: entity.sourceId,
					error: 'invalid JSON',
				});
				continue;
			}

			if (data.issuer !== issuer) continue;

			const cryptoKey = this.resolveCryptoKey(`${entity.sourceId}:${kid}`, data.keyMaterial);
			if (!cryptoKey) continue;

			return {
				kid,
				algorithms: data.algorithms,
				key: cryptoKey,
				issuer: data.issuer,
				expectedAudience: data.expectedAudience,
				allowedRoles: data.allowedRoles,
			};
		}

		return undefined;
	}

	// ─── Public admin/diagnostic methods ───────────────────────────────

	/**
	 * Force-refresh a single source. Can be called from any instance —
	 * uses an advisory lock for distributed mutual exclusion.
	 */
	async refreshSource(sourceId: string): Promise<void> {
		const source = await this.trustedKeySourceRepository.findOneBy({ id: sourceId });
		if (!source) {
			throw new UnexpectedError(`Trusted key source not found: ${sourceId}`);
		}
		await this.refreshSourceInternal(source);
	}

	async listAll(): Promise<TrustedKeyEntity[]> {
		return await this.trustedKeyRepository.find();
	}

	async listSources(): Promise<TrustedKeySourceEntity[]> {
		return await this.trustedKeySourceRepository.find();
	}

	// ─── Private: config parsing ───────────────────────────────────────

	private parseConfigSources(): TrustedKeySource[] {
		const raw = this.config.trustedKeys;

		if (!raw) {
			this.logger.info('No trusted keys configured');
			return [];
		}

		let parsed: unknown;
		try {
			parsed = JSON.parse(raw);
		} catch (error) {
			this.logger.error('Failed to parse trusted keys JSON', { error });
			throw new UnexpectedError('Failed to parse trusted keys JSON');
		}

		const result = z.array(TrustedKeySourceSchema).safeParse(parsed);

		if (!result.success) {
			this.logger.error('Trusted keys JSON has invalid format', { error: result.error });
			throw new UnexpectedError('Trusted keys JSON has invalid format');
		}

		return result.data;
	}

	// ─── Private: source sync ──────────────────────────────────────────

	private generateSourceId(source: TrustedKeySource): string {
		if (source.type === 'static') return STATIC_SOURCE_ID;
		return createHash('sha256').update(source.url).digest('hex').slice(0, 36);
	}

	/**
	 * Upsert source rows to DB and remove orphaned sources whose IDs
	 * are no longer in the current config.
	 */
	private async syncSourcesToDb(sources: TrustedKeySource[]): Promise<void> {
		await this.dbLockService.withLock(DbLock.TRUSTED_KEY_REFRESH, async (tx) => {
			this.logger.debug('Syncing sources to the database', { sources });
			const staticSources = sources.filter((s): s is StaticKeySource => s.type === 'static');
			const jwksSources = sources.filter((s) => s.type === 'jwks');

			const expectedSourceIds = new Set<string>();

			// Group all static keys under a single source
			if (staticSources.length > 0) {
				const sourceId = STATIC_SOURCE_ID;
				expectedSourceIds.add(sourceId);
				await tx.save(TrustedKeySourceEntity, {
					id: sourceId,
					type: 'static' as const,
					config: JSON.stringify(staticSources),
					status: 'pending' as const,
				});
			}

			// Each JWKS URL is a separate source
			for (const jwks of jwksSources) {
				const sourceId = this.generateSourceId(jwks);
				expectedSourceIds.add(sourceId);
				await tx.save(TrustedKeySourceEntity, {
					id: sourceId,
					type: 'jwks' as const,
					config: JSON.stringify(jwks),
					status: 'pending' as const,
				});
			}

			// Remove orphaned config-managed sources
			if (expectedSourceIds.size > 0) {
				await tx.delete(TrustedKeySourceEntity, {
					id: Not(In([...expectedSourceIds])),
				});
			} else {
				await tx.delete(TrustedKeySourceEntity, {});
			}
		});
	}

	// ─── Private: refresh ──────────────────────────────────────────────

	/**
	 * Initial refresh: refreshes all sources unconditionally.
	 * Called once during `initialize` before the poll loop starts.
	 */
	private async refreshAllSources(): Promise<void> {
		try {
			const sources = await this.trustedKeySourceRepository.find();
			for (const source of sources) {
				await this.refreshSourceInternal(source);
			}
		} catch (error) {
			this.logger.error('Failed to run trusted key refresh cycle', { error });
		}
	}

	/**
	 * Poll-driven refresh: only refreshes sources whose `lastRefreshedAt`
	 * is older than their configured refresh interval.
	 */
	private async refreshDueSources(): Promise<void> {
		try {
			this.logger.debug('Refreshing due sources');
			const sources = await this.trustedKeySourceRepository.find();
			const now = Date.now();
			for (const source of sources) {
				const intervalMs = this.getRefreshIntervalMs(source);
				const lastRefresh = source.lastRefreshedAt?.getTime() ?? 0;
				if (now - lastRefresh >= intervalMs) {
					await this.refreshSourceInternal(source);
				}
			}
		} catch (error) {
			this.logger.error('Failed to run trusted key refresh cycle', { error });
		}
	}

	private getRefreshIntervalMs(source: TrustedKeySourceEntity): number {
		if (source.type === 'jwks') {
			try {
				const config = jsonParse<Record<string, unknown>>(source.config);
				if (typeof config.cacheTtlSeconds === 'number' && config.cacheTtlSeconds > 0) {
					return config.cacheTtlSeconds * Time.seconds.toMilliseconds;
				}
			} catch (e) {
				this.logger.warn('Failed to parse source configuration for jwks source', {
					id: source.id,
					error: e,
				});
			}
		}
		return this.config.keyRefreshIntervalSeconds * Time.seconds.toMilliseconds;
	}

	/**
	 * Per-source transactional refresh, serialized by an advisory lock.
	 *
	 * On success: old keys deleted, conflicts resolved, new keys inserted,
	 * source marked healthy.
	 *
	 * On error: transaction rolls back (preserving existing keys), source
	 * marked with `status = 'error'` and `lastError` outside the transaction.
	 */
	private async refreshSourceInternal(source: TrustedKeySourceEntity): Promise<void> {
		try {
			await this.dbLockService.withLock(DbLock.TRUSTED_KEY_REFRESH, async (tx) => {
				const freshSource = await tx.findOneBy(TrustedKeySourceEntity, { id: source.id });
				if (!freshSource) return;
				await this.refreshSourceWithinTransaction(freshSource, tx);
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.logger.error('Failed to refresh trusted key source', {
				sourceId: source.id,
				error: message,
			});
			await this.trustedKeySourceRepository.update(source.id, {
				status: 'error',
				lastError: message,
				lastRefreshedAt: new Date(),
			});
		}
	}

	private async refreshSourceWithinTransaction(
		source: TrustedKeySourceEntity,
		tx: EntityManager,
	): Promise<void> {
		const result = await this.resolveKeysForSource(source);
		if (!result) {
			// Mark as refreshed so the source is skipped until the next interval,
			// even though no keys were resolved (e.g. unsupported source type).
			await tx.update(TrustedKeySourceEntity, source.id, {
				status: 'healthy',
				lastRefreshedAt: new Date(),
			});
			return;
		}

		const keys = result.keys;
		const cacheTtlSeconds = result.cacheTtlSeconds;

		// 1. DELETE old keys for this source
		await tx.delete(TrustedKeyEntity, { sourceId: source.id });

		// 2. INSERT new keys
		for (const key of keys) {
			await tx.save(TrustedKeyEntity, {
				sourceId: source.id,
				kid: key.kid,
				data: JSON.stringify(key.data),
				createdAt: new Date(),
			});
		}

		// 3. UPDATE source status, and persist observed cache TTL for refresh scheduling
		const updatePayload: Partial<TrustedKeySourceEntity> = {
			status: 'healthy' as const,
			lastError: null,
			lastRefreshedAt: new Date(),
		};
		if (cacheTtlSeconds !== undefined) {
			const config = jsonParse<Record<string, unknown>>(source.config);
			config.cacheTtlSeconds = cacheTtlSeconds;
			updatePayload.config = JSON.stringify(config);
		}
		await tx.update(TrustedKeySourceEntity, source.id, updatePayload);
	}

	/**
	 * Resolve keys for a source by type. Returns `undefined` for
	 * unsupported types (signalling the caller should skip).
	 *
	 * Static sources return a plain array. JWKS sources return an object
	 * with keys and observed cache TTL for refresh scheduling.
	 */
	private async resolveKeysForSource(
		source: TrustedKeySourceEntity,
	): Promise<
		{ keys: Array<{ kid: string; data: TrustedKeyData }>; cacheTtlSeconds?: number } | undefined
	> {
		switch (source.type) {
			case 'static':
				return this.resolveKeysForStaticSource(source);
			case 'jwks':
				return await this.resolveKeysForJwksSource(source);
			default:
				this.logger.warn('Unknown key source type, skipping', {
					sourceId: source.id,
					type: source.type,
				});
				return undefined;
		}
	}

	private async resolveKeysForJwksSource(
		source: TrustedKeySourceEntity,
	): Promise<{ keys: Array<{ kid: string; data: TrustedKeyData }>; cacheTtlSeconds: number }> {
		let jwksConfig: JwksKeySource;
		try {
			jwksConfig = jsonParse<JwksKeySource>(source.config);
		} catch {
			throw new UnexpectedError('Invalid JWKS source config: malformed JSON');
		}

		const result = await this.jwksResolverService.resolveKeys(jwksConfig);

		if (result.skipped.length > 0) {
			this.logger.debug(`JWKS "${jwksConfig.url}": skipped ${result.skipped.length} key(s)`, {
				skipped: result.skipped,
			});
		}

		return {
			keys: result.keys.map((key) => ({
				kid: key.kid,
				data: {
					algorithms: key.algorithms as JwtAlgorithm[],
					keyMaterial: key.keyMaterial,
					issuer: key.issuer,
					expectedAudience: key.expectedAudience,
					allowedRoles: key.allowedRoles,
					expiresAt: new Date(Date.now() + result.ttlSeconds * 1000).toISOString(),
				},
			})),
			cacheTtlSeconds: result.ttlSeconds,
		};
	}

	private resolveKeysForStaticSource(source: TrustedKeySourceEntity): {
		keys: Array<{ kid: string; data: TrustedKeyData }>;
		cacheTtlSeconds?: number;
	} {
		let rawConfig: unknown;
		try {
			rawConfig = JSON.parse(source.config);
		} catch {
			throw new UnexpectedError('Invalid static source config: malformed JSON');
		}
		const configResult = z.array(TrustedKeySourceSchema).safeParse(rawConfig);
		if (!configResult.success) {
			throw new UnexpectedError(`Invalid static source config: ${configResult.error.message}`);
		}
		const staticConfigs = configResult.data.filter(
			(s): s is StaticKeySource => s.type === 'static',
		);
		return {
			keys: this.resolveStaticKeys(staticConfigs),
		};
	}

	// ─── Private: key resolution ───────────────────────────────────────

	private resolveStaticKeys(
		configs: StaticKeySource[],
	): Array<{ kid: string; data: TrustedKeyData }> {
		const result: Array<{ kid: string; data: TrustedKeyData }> = [];
		const seenKids = new Set<string>();

		for (const config of configs) {
			const { kid, algorithms, key: pemString, issuer, expectedAudience, allowedRoles } = config;

			if (seenKids.has(kid)) {
				throw new UnexpectedError(`Trusted key "${kid}": duplicate kid`);
			}
			seenKids.add(kid);

			this.validateKeyMaterial(kid, algorithms, pemString);

			result.push({
				kid,
				data: {
					algorithms,
					keyMaterial: pemString,
					issuer,
					expectedAudience,
					allowedRoles,
				},
			});
		}

		return result;
	}

	private validateKeyMaterial(kid: string, algorithms: string[], pemString: string): void {
		// 1. Resolve and validate algorithm families
		const families = new Set<AlgorithmFamily>();
		for (const alg of algorithms) {
			const family = ALGORITHM_FAMILY[alg];
			if (!family) {
				throw new UnexpectedError(`Trusted key "${kid}": unknown algorithm "${alg}"`);
			}
			families.add(family);
		}

		// 2. Reject cross-family mixing
		if (families.size > 1) {
			throw new UnexpectedError(
				`Trusted key "${kid}": algorithms must belong to the same family, got ${[...families].join(', ')}`,
			);
		}

		const family = [...families][0];

		// 3. Parse PEM
		let keyObject: ReturnType<typeof createPublicKey>;
		try {
			keyObject = createPublicKey(pemString);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'unknown error';
			throw new UnexpectedError(`Trusted key "${kid}": failed to parse public key — ${message}`);
		}

		// 4. Validate key type matches algorithm family
		const keyType = keyObject.asymmetricKeyType;
		const expectedTypes: Record<AlgorithmFamily, string[]> = {
			RSA: ['rsa'],
			EC: ['ec'],
			EdDSA: ['ed25519', 'ed448'],
		};

		if (!expectedTypes[family].includes(keyType ?? '')) {
			throw new UnexpectedError(
				`Trusted key "${kid}": key type "${keyType}" does not match algorithm family "${family}"`,
			);
		}
	}

	// ─── Private: crypto cache ─────────────────────────────────────────

	private resolveCryptoKey(cacheKey: string, keyMaterial: string): KeyObject | undefined {
		const hash = createHash('sha256').update(keyMaterial).digest('hex');
		const cached = this.cryptoCache.get(cacheKey);

		if (cached && cached.keyMaterialHash === hash) {
			return cached.cryptoKey;
		}

		try {
			const cryptoKey = createPublicKey(keyMaterial);
			this.cryptoCache.set(cacheKey, { keyMaterialHash: hash, cryptoKey });
			return cryptoKey;
		} catch (error) {
			this.logger.warn('Failed to parse key material from DB', {
				cacheKey,
				error: error instanceof Error ? error.message : String(error),
			});
			return undefined;
		}
	}
}
