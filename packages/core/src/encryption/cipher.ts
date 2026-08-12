import { Service } from '@n8n/di';
import { createHash } from 'crypto';

import { InstanceSettings } from '@/instance-settings';
import { assertUnreachable } from '@/utils/assertions';

import { CipherAes256CBC } from './aes-256-cbc';
import { CipherAes256GCM } from './aes-256-gcm';
import { EncryptionKeyProxy } from './encryption-key-proxy';
import { CipherAlgorithm } from './interface';

@Service()
export class Cipher {
	constructor(
		private readonly instanceSettings: InstanceSettings,
		private readonly cipherAES256GCM: CipherAes256GCM,
		private readonly cipherAES256CBC: CipherAes256CBC,
		private readonly encryptionKeyProxy: EncryptionKeyProxy,
	) {}

	encrypt(data: string | object, customEncryptionKey?: string): string {
		const key = customEncryptionKey ?? this.instanceSettings.encryptionKey;
		const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
		return this.encryptWithKey(plaintext, key, 'aes-256-cbc');
	}

	decrypt(data: string, customEncryptionKey?: string): string {
		const key = customEncryptionKey ?? this.instanceSettings.encryptionKey;
		return this.decryptWithKey(data, key, 'aes-256-cbc');
	}

	async encryptV2(data: string | object, customEncryptionKey?: string): Promise<string> {
		const plaintext = typeof data === 'string' ? data : JSON.stringify(data);

		if (
			!customEncryptionKey &&
			this.encryptionKeyProxy.isConfigured() &&
			process.env.N8N_ENV_FEAT_ENCRYPTION_KEY_ROTATION === 'true'
		) {
			const keyInfo = await this.encryptionKeyProxy.getActiveKey();
			const plaintextKey = this.decryptDEKWithInstanceKey(keyInfo.value);
			const ciphertext = this.encryptWithKey(
				plaintext,
				plaintextKey,
				keyInfo.algorithm as CipherAlgorithm,
			);
			return `${keyInfo.id}:${ciphertext}`;
		}

		const key = customEncryptionKey ?? this.instanceSettings.encryptionKey;
		return this.encryptWithKey(plaintext, key, 'aes-256-cbc');
	}

	async decryptV2(data: string, customEncryptionKey?: string): Promise<string> {
		if (
			!customEncryptionKey &&
			this.encryptionKeyProxy.isConfigured() &&
			process.env.N8N_ENV_FEAT_ENCRYPTION_KEY_ROTATION === 'true'
		) {
			const colonIdx = data.indexOf(':');
			if (colonIdx !== -1) {
				const keyId = data.slice(0, colonIdx);
				const ciphertext = data.slice(colonIdx + 1);
				const keyInfo = await this.encryptionKeyProxy.getKeyById(keyId);
				if (!keyInfo) throw new Error(`Encryption key not found: ${keyId}`);
				const plaintextKey = this.decryptDEKWithInstanceKey(keyInfo.value);
				return this.decryptWithKey(ciphertext, plaintextKey, keyInfo.algorithm as CipherAlgorithm);
			}
			const keyInfo = await this.encryptionKeyProxy.getLegacyKey();
			const plaintextKey = this.decryptDEKWithInstanceKey(keyInfo.value);
			return this.decryptWithKey(data, plaintextKey, keyInfo.algorithm as CipherAlgorithm);
		}

		const key = customEncryptionKey ?? this.instanceSettings.encryptionKey;
		return this.decryptWithKey(data, key, 'aes-256-cbc');
	}

	/**
	 * Encrypts with the instance encryption key specifically. Use this for payloads
	 * (e.g. credential data and other user content) that must be protected by the
	 * instance key independently of any future change to the default `encrypt` key.
	 */
	encryptWithInstanceKey(data: string | object): string {
		const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
		return this.encryptWithKey(plaintext, this.instanceSettings.encryptionKey, 'aes-256-cbc');
	}

	/** Counterpart of {@link encryptWithInstanceKey}. */
	decryptWithInstanceKey(data: string): string {
		return this.decryptWithKey(data, this.instanceSettings.encryptionKey, 'aes-256-cbc');
	}

	/**
	 * Encrypts a data-encryption key (DEK) with the instance key using AES-256-GCM.
	 * DEKs are always wrapped with GCM for authenticated encryption and integrity.
	 */
	encryptDEKWithInstanceKey(data: string): string {
		return this.encryptWithKey(data, this.dekWrappingKey, 'aes-256-gcm');
	}

	/** Counterpart of {@link encryptDEKWithInstanceKey}. */
	decryptDEKWithInstanceKey(data: string): string {
		return this.decryptWithKey(data, this.dekWrappingKey, 'aes-256-gcm');
	}

	/** Derives a 32-byte (64 hex char) GCM-compatible key from the instance encryption key. */
	private get dekWrappingKey(): string {
		return createHash('sha256').update(this.instanceSettings.encryptionKey).digest('hex');
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
