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
