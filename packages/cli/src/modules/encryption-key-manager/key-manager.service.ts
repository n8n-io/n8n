import { DeploymentKeyRepository, type DeploymentKey } from '@n8n/db';
import { Service } from '@n8n/di';
import { Cipher, type CipherAlgorithm } from 'n8n-core';
import { randomBytes } from 'node:crypto';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

type KeyInfo = { id: string; value: string; algorithm: string };

@Service()
export class KeyManagerService {
	constructor(
		private readonly deploymentKeyRepository: DeploymentKeyRepository,
		private readonly cipher: Cipher,
	) {}

	/** Returns the current active encryption key. Throws if none exists or if multiple are found. */
	async getActiveKey(): Promise<KeyInfo> {
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
		return { id: key.id, value: key.value, algorithm: key.algorithm! };
	}

	/** Returns a key by id, or null if not found. */
	async getKeyById(id: string): Promise<KeyInfo | null> {
		const key = await this.deploymentKeyRepository.findOne({ where: { id } });
		if (!key) return null;
		return { id: key.id, value: key.value, algorithm: key.algorithm! };
	}

	/** Returns the legacy CBC key (used to decrypt rows with NULL encryptionKeyId). */
	async getLegacyKey(): Promise<KeyInfo> {
		const key = await this.deploymentKeyRepository.findOne({
			where: { type: 'data_encryption', algorithm: 'aes-256-cbc' },
		});
		if (!key) {
			throw new NotFoundError('No legacy aes-256-cbc encryption key found');
		}
		return { id: key.id, value: key.value, algorithm: key.algorithm! };
	}

	/**
	 * Seeds an inactive aes-256-cbc key from the instance encryption key if none exists.
	 * The value is wrapped with the instance key via AES-256-GCM before storage.
	 */
	async bootstrapLegacyCbcKey(instanceEncryptionKey: string): Promise<void> {
		const existing = await this.deploymentKeyRepository.findOne({
			where: { type: 'data_encryption', algorithm: 'aes-256-cbc' },
		});
		if (existing) return;

		const encryptedValue = this.cipher.encryptDEKWithInstanceKey(instanceEncryptionKey);
		const entity = this.deploymentKeyRepository.create({
			type: 'data_encryption',
			value: encryptedValue,
			algorithm: 'aes-256-cbc',
			status: 'inactive',
		});
		await this.deploymentKeyRepository.save(entity);
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

	/** Lists encryption keys, optionally filtered by type. */
	async listKeys(type?: string): Promise<DeploymentKey[]> {
		if (type) return await this.deploymentKeyRepository.findAllByType(type);
		return await this.deploymentKeyRepository.find();
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
		return await this.deploymentKeyRepository.insertAsActive(entity);
	}

	/** Atomically deactivates the current active key and promotes the given key. */
	async setActiveKey(id: string): Promise<void> {
		await this.deploymentKeyRepository.promoteToActive(id, 'data_encryption');
	}

	/** Transitions key to 'inactive'. Usage count guard to be added in T13. */
	async markInactive(id: string): Promise<void> {
		// TODO: T13 will add usage check — throw ConflictError if usage count > 0
		await this.deploymentKeyRepository.update(id, { status: 'inactive' });
	}
}
