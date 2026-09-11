import type { ListEncryptionKeysQueryDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import {
	DeploymentKeyRepository,
	type DeploymentKey,
	type DeploymentKeySortDirection,
	type DeploymentKeySortField,
} from '@n8n/db';
import { Service } from '@n8n/di';
import {
	Cipher,
	InstanceSettings,
	type CipherAlgorithm,
	type IEncryptionKeyProvider,
	type KeyInfo,
} from 'n8n-core';
import { randomBytes } from 'node:crypto';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { isKeyRotationEnabled } from './key-rotation-flag';

/** Raw DEK format: 64 hex chars stored directly as key material (n8n 2.18.x). */
const RAW_DEK_PATTERN = /^[0-9a-f]{64}$/i;

/** AES-256-CBC (OpenSSL Salted__) wrapped DEK, base64 prefix (n8n 2.19.x). */
const CBC_WRAPPED_PREFIX = 'U2FsdGVk';

/**
 * How long a process trusts its database view of the active key. A rotation
 * done on another instance becomes visible within this window — the accepted
 * propagation delay in a distributed setup — at the cost of one active-key
 * query per instance per interval. Local rotations switch immediately.
 */
const ACTIVE_KEY_MEMO_TTL_MS = 5 * 1000;

/**
 * Keys are immutable per id (only `status` changes, and `KeyInfo` omits it),
 * so the by-id LRU needs no invalidation. Values are instance-key-wrapped.
 */
const KEY_BY_ID_CACHE_CAPACITY = 10;

@Service()
export class KeyManagerService implements IEncryptionKeyProvider {
	/**
	 * Memoized legacy instance-key descriptor: the write descriptor while
	 * rotation is off, and the read fallback when the store cannot serve the
	 * seeded legacy key.
	 */
	private cachedInstanceKeyInfo?: KeyInfo;

	/** Memoized stored legacy CBC row — immutable once seeded, never deleted. */
	private cachedStoredLegacyKey?: KeyInfo;

	/** In-process LRU for by-id lookups. See {@link KEY_BY_ID_CACHE_CAPACITY}. */
	private readonly keyInfoById = new Map<string, KeyInfo>();

	/** Short-lived DB view of the active key. See {@link ACTIVE_KEY_MEMO_TTL_MS}. */
	private activeKeyMemo?: { info: KeyInfo; expiresAt: number };

	constructor(
		private readonly deploymentKeyRepository: DeploymentKeyRepository,
		private readonly cipher: Cipher,
		private readonly instanceSettings: InstanceSettings,
		private readonly logger: Logger,
	) {}

	/**
	 * Returns the descriptor the cipher must encrypt with. The rotation on/off
	 * decision lives here, in the module: while rotation is off, this is the
	 * legacy instance-key descriptor (old output format, fully reversible);
	 * with rotation on, it is the active data-encryption key from the store.
	 */
	async getActiveKey(): Promise<KeyInfo> {
		if (!isKeyRotationEnabled()) {
			return this.instanceKeyLegacyInfo();
		}

		// Steady state: the memoized database view serves writes, one active-key
		// query per memo period instead of one per operation.
		if (this.activeKeyMemo && this.activeKeyMemo.expiresAt > Date.now()) {
			return this.activeKeyMemo.info;
		}

		const activeKeys = await this.deploymentKeyRepository.find({
			where: { type: 'data_encryption', status: 'active' },
		});
		if (activeKeys.length === 0) {
			throw new NotFoundError('No active encryption key found');
		}
		if (activeKeys.length > 1) {
			throw new Error('Encryption key invariant violated: multiple active keys found');
		}
		const key = activeKeys[0];
		const keyInfo: KeyInfo = {
			id: key.id,
			value: key.value,
			algorithm: key.algorithm!,
			format: 'prefixed',
		};
		this.rememberKeyInfo(keyInfo);
		this.activeKeyMemo = { info: keyInfo, expiresAt: Date.now() + ACTIVE_KEY_MEMO_TTL_MS };
		return keyInfo;
	}

	/**
	 * Returns a key by id, or null if not found. LRU-served after the first
	 * lookup; misses are never cached so an unknown id cannot evict real keys.
	 */
	async getKeyById(id: string): Promise<KeyInfo | null> {
		const cached = this.keyInfoById.get(id);
		if (cached) {
			// Re-insert to refresh recency in the Map-based LRU.
			this.keyInfoById.delete(id);
			this.keyInfoById.set(id, cached);
			return cached;
		}

		const key = await this.deploymentKeyRepository.findOne({ where: { id } });
		if (!key) return null;
		const keyInfo: KeyInfo = {
			id: key.id,
			value: key.value,
			algorithm: key.algorithm!,
			format: 'prefixed',
		};
		this.rememberKeyInfo(keyInfo);
		return keyInfo;
	}

	/**
	 * Returns the raw DEK for a legacy-format value, or null if the value is already
	 * GCM-wrapped or cannot be recovered with this instance key.
	 */
	private recoverLegacyDek(keyInfo: DeploymentKey): string | null {
		const { value } = keyInfo;
		// 2.18.x: raw key material, used directly. Re-wrap as-is, no decrypt needed.
		if (RAW_DEK_PATTERN.test(value)) {
			return value;
		}

		// 2.19.x: DEK wrapped with the instance key via AES-256-CBC.
		if (value.startsWith(CBC_WRAPPED_PREFIX)) {
			let recovered: string;
			try {
				recovered = this.cipher.decryptWithInstanceKey(value);
			} catch {
				this.logger.warn(
					`Failed to decrypt legacy CBC-wrapped DEK ${keyInfo.id} with the instance key, this was probably wrapped with a different instance key`,
				);
				return null;
			}

			if (!RAW_DEK_PATTERN.test(recovered)) {
				this.logger.warn(`Recovered legacy DEK ${keyInfo.id} is not valid raw key material`);
				return null;
			}

			return recovered;
		}

		// Already GCM-wrapped or an unknown format: leave untouched.
		return null;
	}

	/**
	 * Re-wraps data-encryption keys stored in a pre-2.20 legacy format. Early key
	 * managers stored the DEK either as raw 64-hex key material (2.18.x) or wrapped
	 * with the instance key via AES-256-CBC (2.19.x). The current unwrap path expects
	 * a GCM blob, so both fail to decrypt. Both wrap the same 64-hex DEK; recovering
	 * it and re-wrapping with GCM restores the exact same key, so data stays readable.
	 * Idempotent: a GCM value matches neither legacy detector and is left untouched.
	 */
	async repairLegacyDataEncryptionKeys(): Promise<void> {
		const rows = await this.deploymentKeyRepository.findDataEncryptionKeys();
		for (const row of rows) {
			const rawKey = this.recoverLegacyDek(row);
			if (rawKey === null) continue;
			const wrapped = this.cipher.encryptDEKWithInstanceKey(rawKey);
			await this.deploymentKeyRepository.rewrapLegacyDataEncryptionValue(
				row.id,
				row.value,
				wrapped,
			);
			this.logger.info(`Re-wrapped legacy DEK ${row.id} with the instance key`);
		}
	}

	/**
	 * Returns the legacy CBC key used to decrypt old rows (no keyId prefix).
	 *
	 * Prefers the stored key so the real read path stays exercised. If the store
	 * cannot serve it — the key is not seeded, or the store is unreachable — falls
	 * back to the instance key directly. Old data is plain CBC under the instance
	 * key, and the seeded legacy key IS the instance key, so both paths yield the
	 * same result. This keeps reads of old data working while the store is degraded.
	 */
	async getLegacyKey(): Promise<KeyInfo> {
		if (this.cachedStoredLegacyKey) return this.cachedStoredLegacyKey;

		try {
			const key = await this.deploymentKeyRepository.findOne({
				where: { type: 'data_encryption', algorithm: 'aes-256-cbc' },
			});
			if (key) {
				this.cachedStoredLegacyKey = {
					id: key.id,
					value: key.value,
					algorithm: key.algorithm!,
					format: 'no-prefix',
				};
				return this.cachedStoredLegacyKey;
			}
			if (!this.cachedInstanceKeyInfo) {
				this.logger.warn(
					'Legacy aes-256-cbc encryption key not found; falling back to instance key',
				);
			}
		} catch (error) {
			this.logger.warn(
				'Key store unavailable while reading legacy key; using the instance key directly',
				{ error },
			);
		}
		return this.instanceKeyLegacyInfo();
	}

	/**
	 * Seeds an inactive aes-256-cbc key from the instance encryption key if none exists.
	 * The value is wrapped with the instance key via AES-256-GCM before storage.
	 * Race-safe across concurrent mains: the repository runs the check-and-insert
	 * inside a `DbLock` critical section. The check here is only a fast path to
	 * skip the lock on every startup after the first.
	 */
	async bootstrapLegacyCbcKey(instanceEncryptionKey: string): Promise<void> {
		const existing = await this.deploymentKeyRepository.findOne({
			where: { type: 'data_encryption', algorithm: 'aes-256-cbc' },
		});
		if (existing) return;

		const encryptedValue = this.cipher.encryptDEKWithInstanceKey(instanceEncryptionKey);
		await this.deploymentKeyRepository.seedLegacyCbcKey(encryptedValue);
	}

	/**
	 * Builds the legacy KeyInfo from the instance key, the fallback when the store
	 * cannot serve the legacy key. Wraps the instance key exactly as bootstrap
	 * does, so `Cipher` unwraps it and decrypts old CBC data unchanged. Memoized
	 * because the instance key does not change at runtime.
	 */
	private instanceKeyLegacyInfo(): KeyInfo {
		this.cachedInstanceKeyInfo ??= {
			id: 'instance-key',
			value: this.cipher.encryptDEKWithInstanceKey(this.instanceSettings.encryptionKey),
			algorithm: 'aes-256-cbc',
			format: 'no-prefix',
		};
		return this.cachedInstanceKeyInfo;
	}

	/**
	 * Seeds an active aes-256-gcm key if no active GCM key exists.
	 * Race-safe across concurrent mains: the DB's partial unique index on
	 * (type, status='active') serializes inserts, and losers are silently ignored.
	 */
	async bootstrapGcmKey(): Promise<void> {
		const existing = await this.deploymentKeyRepository.findOne({
			where: { type: 'data_encryption', algorithm: 'aes-256-gcm', status: 'active' },
		});
		if (existing) return;

		const rawKey = randomBytes(32).toString('hex');
		const encryptedValue = this.cipher.encryptDEKWithInstanceKey(rawKey);
		await this.deploymentKeyRepository.insertOrIgnore({
			type: 'data_encryption',
			value: encryptedValue,
			algorithm: 'aes-256-gcm',
			status: 'active',
		});
	}

	/**
	 * Lists encryption keys with pagination, optional filtering by type and
	 * activation date, and an optional `sortBy` of the form `field:direction`.
	 * Defaults to `createdAt:desc` when no `sortBy` is provided.
	 */
	async listKeys(
		query: ListEncryptionKeysQueryDto,
	): Promise<{ items: DeploymentKey[]; count: number }> {
		const [field, direction] = (query.sortBy ?? 'createdAt:desc').split(':') as [
			DeploymentKeySortField,
			'asc' | 'desc',
		];

		return await this.deploymentKeyRepository.findAndCountForList({
			type: query.type,
			sortField: field,
			sortDirection: direction.toUpperCase() as DeploymentKeySortDirection,
			skip: query.skip,
			take: query.take,
			createdAtFrom: query.activatedFrom ? new Date(query.activatedFrom) : undefined,
			createdAtTo: query.activatedTo ? new Date(query.activatedTo) : undefined,
		});
	}

	/**
	 * Generates a new 256-bit data-encryption key and inserts it as the active key,
	 * atomically deactivating the previous active key.
	 */
	async rotateKey(): Promise<DeploymentKey> {
		const rawKey = randomBytes(32).toString('hex');
		return await this.addKey(rawKey, 'aes-256-gcm', true);
	}

	/**
	 * Encrypts the given plaintext value with the instance encryption key and inserts
	 * it as a new deployment key row. If setAsActive, atomically deactivates the
	 * previous active key; otherwise the new key is inserted as inactive.
	 *
	 * Data-encryption keys must always be wrapped with the instance key — never with
	 * the currently active data key — which is why this goes through
	 * `encryptWithInstanceKey` rather than the generic `encrypt`.
	 */
	async addKey(
		plaintextValue: string,
		algorithm: CipherAlgorithm,
		setAsActive = false,
	): Promise<DeploymentKey> {
		const encryptedValue = this.cipher.encryptDEKWithInstanceKey(plaintextValue);

		if (!setAsActive) {
			const entity = this.deploymentKeyRepository.create({
				type: 'data_encryption',
				value: encryptedValue,
				algorithm,
				status: 'inactive',
			});
			return await this.deploymentKeyRepository.save(entity);
		}

		const entity = Object.assign(
			this.deploymentKeyRepository.create({
				type: 'data_encryption',
				value: encryptedValue,
				algorithm,
			}),
			{ status: 'active' as const },
		);
		const saved = await this.deploymentKeyRepository.insertAsActive(entity);
		// Update the memo only after the commit — otherwise this instance could
		// encrypt with a key that never landed in the database. Local writes
		// switch immediately; other instances follow within the memo window.
		const savedInfo: KeyInfo = {
			id: saved.id,
			value: saved.value,
			algorithm: saved.algorithm!,
			format: 'prefixed',
		};
		this.rememberKeyInfo(savedInfo);
		this.activeKeyMemo = { info: savedInfo, expiresAt: Date.now() + ACTIVE_KEY_MEMO_TTL_MS };
		return saved;
	}

	/** Atomically deactivates the current active key and promotes the given key. */
	async setActiveKey(id: string): Promise<void> {
		await this.deploymentKeyRepository.promoteToActive(id, 'data_encryption');
		this.activeKeyMemo = undefined;
	}

	/** Transitions key to 'inactive'. Usage count guard to be added in T13. */
	async markInactive(id: string): Promise<void> {
		// TODO: T13 will add usage check — throw ConflictError if usage count > 0
		await this.deploymentKeyRepository.update(id, { status: 'inactive' });
		// The active key may be gone now: force the next write to re-read the store.
		this.activeKeyMemo = undefined;
	}

	/** Keeps the by-id LRU at capacity; evicts the least recently used entry. */
	private rememberKeyInfo(keyInfo: KeyInfo): void {
		this.keyInfoById.delete(keyInfo.id);
		this.keyInfoById.set(keyInfo.id, keyInfo);
		if (this.keyInfoById.size > KEY_BY_ID_CACHE_CAPACITY) {
			const oldest = this.keyInfoById.keys().next().value;
			if (oldest !== undefined) this.keyInfoById.delete(oldest);
		}
	}
}
