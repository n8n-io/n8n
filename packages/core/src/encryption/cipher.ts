import { Service } from '@n8n/di';

import { InstanceSettings } from '@/instance-settings';
import { assertUnreachable } from '@/utils/assertions';

import { CipherAes256CBC } from './aes-256-cbc';
import { CipherAes256GCM } from './aes-256-gcm';
import { CipherAlgorithm } from './interface';

@Service()
export class Cipher {
	constructor(
		private readonly instanceSettings: InstanceSettings,
		private readonly cipherAES256GCM: CipherAes256GCM,
		private readonly cipherAES256CBC: CipherAes256CBC,
	) {}

	encrypt(data: string | object, customEncryptionKey?: string) {
		const key = customEncryptionKey ?? this.instanceSettings.encryptionKey;
		const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
		return this.encryptWithKey(plaintext, key, 'aes-256-cbc');
	}

	decrypt(data: string, customEncryptionKey?: string) {
		const key = customEncryptionKey ?? this.instanceSettings.encryptionKey;
		return this.decryptWithKey(data, key, 'aes-256-cbc');
	}

	/**
	 * Encrypts with the instance encryption key specifically. Use this for payloads
	 * that must be protected by the instance key (e.g. data-encryption keys
	 * themselves), independently of any future change to the default `encrypt` key.
	 */
	encryptWithInstanceKey(data: string | object): string {
		const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
		return this.encryptWithKey(plaintext, this.instanceSettings.encryptionKey, 'aes-256-cbc');
	}

	/** Counterpart of {@link encryptWithInstanceKey}. */
	decryptWithInstanceKey(data: string): string {
		return this.decryptWithKey(data, this.instanceSettings.encryptionKey, 'aes-256-cbc');
	}

	encryptWithKey(data: string, key: string, algorithm: CipherAlgorithm): string {
		switch (algorithm) {
			case 'aes-256-cbc':
				return this.cipherAES256CBC.encrypt(data, key);
			case 'aes-256-gcm':
				return this.cipherAES256GCM.encrypt(data, key);
		}
		assertUnreachable(algorithm);
	}

	decryptWithKey(data: string, key: string, algorithm: CipherAlgorithm): string {
		switch (algorithm) {
			case 'aes-256-cbc':
				return this.cipherAES256CBC.decrypt(data, key);
			case 'aes-256-gcm':
				return this.cipherAES256GCM.decrypt(data, key);
		}
		assertUnreachable(algorithm);
	}
}
