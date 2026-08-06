import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { KeyObject } from 'node:crypto';
import { createHash, createPublicKey } from 'node:crypto';

import { TrustedKeySourceEntity } from '../database/entities/trusted-key-source.entity';
import { TrustedKeyEntity } from '../database/entities/trusted-key.entity';
import { TrustedKeySourceRepository } from '../database/repositories/trusted-key-source.repository';
import { TrustedKeyRepository } from '../database/repositories/trusted-key.repository';
import type { ResolvedTrustedKey, TrustedKeyData } from '../identity-substrate.schemas';
import { TrustedKeyDataSchema } from '../identity-substrate.schemas';

/**
 * Read-only lookups over trusted public keys for JWT signature verification.
 *
 * Every instance reads keys from the database on every lookup, so
 * multi-instance consistency is preserved without any local write path here.
 * A local crypto-primitive cache avoids repeated `createPublicKey()` calls
 * when the underlying key material has not changed.
 *
 * Deliberately has no dependency on the write/refresh lifecycle (config,
 * distributed lock, JWKS fetching, leader/shutdown hooks) - see
 * `TrustedKeySyncService` for that half. This split lets every instance type
 * (main, worker, webhook) resolve keys safely, while only `main` runs the
 * sync/refresh machinery that populates the table.
 */
@Service()
export class TrustedKeyService {
	private readonly logger: Logger;

	private readonly cryptoCache = new Map<
		string,
		{ keyMaterialHash: string; cryptoKey: KeyObject }
	>();

	constructor(
		logger: Logger,
		private readonly trustedKeySourceRepository: TrustedKeySourceRepository,
		private readonly trustedKeyRepository: TrustedKeyRepository,
	) {
		this.logger = logger.scoped('token-exchange');
	}

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
				sourceId: entity.sourceId,
				kid,
				algorithms: data.algorithms,
				key: cryptoKey,
				issuer: data.issuer,
				expectedAudience: data.expectedAudience,
				allowedRoles: data.allowedRoles,
				requireVerifiedEmail: data.requireVerifiedEmail ?? true,
				subjectClaim: data.subjectClaim ?? 'sub',
			};
		}

		return undefined;
	}

	async listAll(): Promise<TrustedKeyEntity[]> {
		return await this.trustedKeyRepository.find();
	}

	async listSources(): Promise<TrustedKeySourceEntity[]> {
		return await this.trustedKeySourceRepository.find();
	}

	async hasSingleTrustedIssuer(): Promise<boolean> {
		const sources = await this.listAll();
		const issuers = new Set<string>();

		sources.forEach((entity) => {
			try {
				const parsed = TrustedKeyDataSchema.safeParse(JSON.parse(entity.data));
				if (!parsed.success) {
					this.logger.warn('Skipping corrupted trusted key entity', {
						kid: entity.kid,
						sourceId: entity.sourceId,
						error: parsed.error.message,
					});
					return;
				}
				issuers.add(parsed.data.issuer);
			} catch {
				this.logger.warn('Skipping corrupted trusted key entity', {
					kid: entity.kid,
					sourceId: entity.sourceId,
					error: 'invalid JSON',
				});
			}
		});
		return issuers.size === 1;
	}

	/**
	 * Whether `issuer` is the instance's configured SSO provider — i.e. it
	 * matches a `sso-derived` trusted key source (see
	 * `TrustedKeySyncService.registerSsoDerivedSource`). Indexed read only: no
	 * network, no crypto, safe to call on every access.
	 */
	async isSsoIssuer(issuer: string): Promise<boolean> {
		const source = await this.trustedKeySourceRepository.findOne({
			where: { issuer, managedBy: 'sso-derived' },
		});
		return source !== null;
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
