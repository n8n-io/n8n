import { Service } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';

export type KeyInfo = { id: string; value: string; algorithm: string };

export interface IEncryptionKeyProvider {
	getActiveKey(): Promise<KeyInfo>;
	getKeyById(id: string): Promise<KeyInfo | null>;
	getLegacyKey(): Promise<KeyInfo>;
}

/**
 * Bridge between `Cipher` (packages/core) and the key manager (packages/cli).
 * Always registered in the DI container. `EncryptionKeyManagerModule` calls
 * `setProvider()` at init time to wire up the concrete implementation without
 * introducing a circular dependency.
 *
 * `value` in `KeyInfo` is the key material already encrypted with the instance key.
 * Callers must `decryptWithInstanceKey()` before using it for data encryption.
 */
@Service()
export class EncryptionKeyProxy {
	private provider: IEncryptionKeyProvider | undefined;

	setProvider(provider: IEncryptionKeyProvider | undefined): void {
		this.provider = provider;
	}

	isConfigured(): boolean {
		return this.provider !== undefined;
	}

	async getActiveKey(): Promise<KeyInfo> {
		if (!this.provider) throw new UnexpectedError('Encryption key provider is not configured');
		return await this.provider.getActiveKey();
	}

	async getKeyById(id: string): Promise<KeyInfo | null> {
		if (!this.provider) throw new UnexpectedError('Encryption key provider is not configured');
		return await this.provider.getKeyById(id);
	}

	async getLegacyKey(): Promise<KeyInfo> {
		if (!this.provider) throw new UnexpectedError('Encryption key provider is not configured');
		return await this.provider.getLegacyKey();
	}
}
