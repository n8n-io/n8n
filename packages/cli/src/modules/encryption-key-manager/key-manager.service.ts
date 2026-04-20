import { Service } from '@n8n/di';
import { DeploymentKeyRepository } from '@n8n/db';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

type KeyInfo = { id: string; value: string; algorithm: string };

@Service()
export class KeyManagerService {
	constructor(private readonly deploymentKeyRepository: DeploymentKeyRepository) {}

	/** Returns the current active encryption key. Throws if none exists or if multiple are found. */
	async getActiveKey(): Promise<KeyInfo> {
		const activeKeys = await this.deploymentKeyRepository.find({
			where: { type: 'encryption', status: 'active' },
		});
		if (activeKeys.length === 0) {
			throw new NotFoundError('No active encryption key found');
		}
		if (activeKeys.length > 1) {
			throw new Error('Encryption key invariant violated: multiple active keys found');
		}
		const key = activeKeys[0];
		if (!key.algorithm) {
			throw new NotFoundError('Active encryption key has no algorithm set');
		}
		return { id: key.id, value: key.value, algorithm: key.algorithm };
	}

	/** Returns a key by id, or null if not found. */
	async getKeyById(id: string): Promise<KeyInfo | null> {
		const key = await this.deploymentKeyRepository.findOne({ where: { id } });
		if (!key || !key.algorithm) return null;
		return { id: key.id, value: key.value, algorithm: key.algorithm };
	}

	/** Returns the legacy CBC key (used to decrypt rows with NULL encryptionKeyId). */
	async getLegacyKey(): Promise<KeyInfo> {
		const key = await this.deploymentKeyRepository.findOne({
			where: { type: 'encryption', algorithm: 'aes-256-cbc' },
		});
		if (!key) {
			throw new NotFoundError('No legacy aes-256-cbc encryption key found');
		}
		return { id: key.id, value: key.value, algorithm: key.algorithm! };
	}

	/**
	 * Inserts a new encryption key row.
	 * If setAsActive is true, transitions the current active key to 'deprecating' first,
	 * then inserts the new key as 'active'. Otherwise inserts as 'inactive'.
	 */
	async addKey(value: string, algorithm: string, setAsActive = false): Promise<{ id: string }> {
		if (setAsActive) {
			const current = await this.deploymentKeyRepository.findActiveByType('encryption');
			if (current) {
				await this.markDeprecating(current.id);
			}
		}

		const entity = this.deploymentKeyRepository.create({
			type: 'encryption',
			value,
			algorithm,
			status: setAsActive ? 'active' : 'inactive',
			deprecatedAt: null,
		});
		const saved = await this.deploymentKeyRepository.save(entity);
		return { id: saved.id };
	}

	/**
	 * Sets the given key as active.
	 * Transitions the current active key to 'deprecating' first.
	 */
	async setActiveKey(id: string): Promise<void> {
		const current = await this.deploymentKeyRepository.findActiveByType('encryption');
		if (current && current.id !== id) {
			await this.markDeprecating(current.id);
		}
		await this.deploymentKeyRepository.update(id, { status: 'active' });
	}

	/** Transitions key to 'deprecating' status and records deprecatedAt timestamp. */
	async markDeprecating(id: string): Promise<void> {
		await this.deploymentKeyRepository.update(id, {
			status: 'deprecating',
			deprecatedAt: new Date(),
		});
	}

	/** Transitions key to 'inactive'. Usage count guard to be added in T13. */
	async markInactive(id: string): Promise<void> {
		// TODO: T13 will add usage check — throw ConflictError if usage count > 0
		await this.deploymentKeyRepository.update(id, { status: 'inactive' });
	}
}
