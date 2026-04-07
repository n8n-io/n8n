import { createHash, createPublicKey } from 'node:crypto';
import type { KeyObject } from 'node:crypto';

import { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import { DbLock, DbLockService } from '@n8n/db';
import { OnLeaderStepdown, OnLeaderTakeover, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import type { EntityManager } from '@n8n/typeorm';
import type { Algorithm } from 'jsonwebtoken';
import { InstanceSettings } from 'n8n-core';
import { jsonParse, UnexpectedError } from 'n8n-workflow';
import { z } from 'zod';

import { TrustedKeySourceEntity } from '../database/entities/trusted-key-source.entity';
import { TrustedKeyEntity } from '../database/entities/trusted-key.entity';
import { TrustedKeySourceRepository } from '../database/repositories/trusted-key-source.repository';
import { TrustedKeyRepository } from '../database/repositories/trusted-key.repository';
import { TokenExchangeConfig } from '../token-exchange.config';
import type {
	ResolvedTrustedKey,
	StaticKeySource,
	TrustedKeyData,
	TrustedKeySource,
} from '../token-exchange.schemas';
import { TrustedKeySourceSchema } from '../token-exchange.schemas';

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

		const sources = this.parseConfigSources();
		await this.syncSourcesToDb(sources);
		await this.refreshAllSources();
		this.startRefresh();
	}

	@OnLeaderTakeover()
	startRefresh() {
		if (this.isShuttingDown) return;

		const intervalMs = this.config.keyRefreshIntervalSeconds * Time.seconds.toMilliseconds;
		this.refreshInterval = setInterval(async () => await this.refreshAllSources(), intervalMs);

		this.logger.debug(
			`Trusted key refresh scheduled every ${this.config.keyRefreshIntervalSeconds}s`,
		);
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
			const data = jsonParse<TrustedKeyData>(entity.data);
			if (data.issuer !== issuer) continue;

			const cryptoKey = this.resolveCryptoKey(kid, data.keyMaterial);

			return {
				kid,
				algorithms: data.algorithms as Algorithm[],
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
		if (source.type === 'jwks') {
			return createHash('sha256').update(source.url).digest('hex').slice(0, 36);
		}
		// 'ui' sources use DB-generated IDs — should not reach here
		return createHash('sha256').update('ui').digest('hex').slice(0, 36);
	}

	/**
	 * Upsert source rows to DB and remove orphaned sources whose IDs
	 * are no longer in the current config.
	 */
	private async syncSourcesToDb(sources: TrustedKeySource[]): Promise<void> {
		const staticSources = sources.filter((s): s is StaticKeySource => s.type === 'static');
		const jwksSources = sources.filter((s) => s.type === 'jwks');

		const expectedSourceIds = new Set<string>();

		// Group all static keys under a single source
		if (staticSources.length > 0) {
			const sourceId = STATIC_SOURCE_ID;
			expectedSourceIds.add(sourceId);
			await this.trustedKeySourceRepository.save({
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
			await this.trustedKeySourceRepository.save({
				id: sourceId,
				type: 'jwks' as const,
				config: JSON.stringify(jwks),
				status: 'pending' as const,
			});
		}

		// UI sources are skipped — they are DB-generated via future UI

		// Remove orphaned sources no longer in config
		const existingSources = await this.trustedKeySourceRepository.find();
		for (const existing of existingSources) {
			// Only clean up config-managed sources (static/jwks), not UI sources
			if (existing.type !== 'ui' && !expectedSourceIds.has(existing.id)) {
				await this.trustedKeySourceRepository.delete(existing.id);
				this.logger.info('Removed orphaned trusted key source', { sourceId: existing.id });
			}
		}
	}

	// ─── Private: refresh ──────────────────────────────────────────────

	private async refreshAllSources(): Promise<void> {
		const sources = await this.trustedKeySourceRepository.find();
		for (const source of sources) {
			await this.refreshSourceInternal(source);
		}
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
				await this.refreshSourceWithinTransaction(source, tx);
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
		let resolvedKeys: Array<{ kid: string; data: TrustedKeyData }>;

		if (source.type === 'static') {
			const staticConfigs = jsonParse<StaticKeySource[]>(source.config);
			resolvedKeys = this.resolveStaticKeys(staticConfigs);
		} else if (source.type === 'jwks') {
			this.logger.warn('JWKS key sources are not yet supported, skipping', {
				sourceId: source.id,
			});
			return;
		} else {
			// 'ui' — skip for now
			this.logger.warn('UI key sources are not yet supported, skipping', {
				sourceId: source.id,
			});
			return;
		}

		// 1. DELETE old keys for this source
		await tx.delete(TrustedKeyEntity, { sourceId: source.id });

		// 2. For each resolved key, handle cross-source kid conflicts (last-writer-wins)
		for (const key of resolvedKeys) {
			const conflicting = await tx.findBy(TrustedKeyEntity, { kid: key.kid });
			if (conflicting.length > 0) {
				for (const conflict of conflicting) {
					this.logger.warn('Kid conflict: overwriting key from another source', {
						kid: key.kid,
						existingSourceId: conflict.sourceId,
						newSourceId: source.id,
					});
				}
				await tx.delete(TrustedKeyEntity, { kid: key.kid });
			}

			// 3. INSERT new key
			await tx.save(TrustedKeyEntity, {
				sourceId: source.id,
				kid: key.kid,
				data: JSON.stringify(key.data),
				createdAt: new Date(),
			});
		}

		// 4. UPDATE source status
		await tx.update(TrustedKeySourceEntity, source.id, {
			status: 'healthy',
			lastError: null,
			lastRefreshedAt: new Date(),
		});
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

	private resolveCryptoKey(kid: string, keyMaterial: string): KeyObject {
		const hash = createHash('sha256').update(keyMaterial).digest('hex');
		const cached = this.cryptoCache.get(kid);

		if (cached && cached.keyMaterialHash === hash) {
			return cached.cryptoKey;
		}

		const cryptoKey = createPublicKey(keyMaterial);
		this.cryptoCache.set(kid, { keyMaterialHash: hash, cryptoKey });
		return cryptoKey;
	}
}
