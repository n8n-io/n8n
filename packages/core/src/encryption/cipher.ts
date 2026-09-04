import { Service } from '@n8n/di';
import { createHash } from 'crypto';
import { UnexpectedError } from 'n8n-workflow';

import { InstanceSettings } from '@/instance-settings';
import { assertUnreachable } from '@/utils/assertions';

import { CipherAes256CBC } from './aes-256-cbc';
import { CipherAes256GCM } from './aes-256-gcm';
import { EncryptionKeyProxy } from './encryption-key-proxy';
import { CipherAlgorithm } from './interface';

/**
 * Matches the id shape of stored deployment keys (nanoid charset). A colon
 * prefix that cannot be a key id is treated as ciphertext content, so junk
 * or foreign input never reaches the key store and never lands in an error
 * message unvalidated.
 */
const KEY_ID_PATTERN = /^[A-Za-z0-9_-]{1,36}$/;

@Service()
export class Cipher {
	/**
	 * No-prefix descriptors whose key material was already verified to unwrap
	 * to the instance key. The module memoizes its descriptor, so verifying
	 * once per object spares a DEK unwrap on every legacy-format write.
	 */
	private readonly verifiedLegacyDescriptors = new WeakSet<object>();

	constructor(
		private readonly instanceSettings: InstanceSettings,
		private readonly cipherAES256GCM: CipherAes256GCM,
		private readonly cipherAES256CBC: CipherAes256CBC,
		private readonly encryptionKeyProxy: EncryptionKeyProxy,
	) {}

	/** @deprecated Use {@link encryptV2} instead, or {@link encryptWithKey} for an explicit key. */
	encrypt(data: string | object, customEncryptionKey?: string): string {
		const key = customEncryptionKey ?? this.instanceSettings.encryptionKey;
		const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
		return this.encryptWithKey(plaintext, key, 'aes-256-cbc');
	}

	/** @deprecated Use {@link decryptV2} instead, or {@link decryptWithKey} for an explicit key. */
	decrypt(data: string, customEncryptionKey?: string): string {
		const key = customEncryptionKey ?? this.instanceSettings.encryptionKey;
		return this.decryptWithKey(data, key, 'aes-256-cbc');
	}

	/**
	 * Encrypts with whatever active key the provider's descriptor names. The
	 * descriptor carries the key, the algorithm, and the output format — the
	 * rotation on/off decision lives in the key-manager module, not here.
	 * An explicit `customEncryptionKey` stays a short-circuit: raw key, no
	 * unwrap, no prefix.
	 */
	async encryptV2(data: string | object, customEncryptionKey?: string): Promise<string> {
		const plaintext = typeof data === 'string' ? data : JSON.stringify(data);

		if (customEncryptionKey !== undefined) {
			return this.encryptWithKey(plaintext, customEncryptionKey, 'aes-256-cbc');
		}

		if (this.encryptionKeyProxy.isConfigured()) {
			const keyInfo = await this.encryptionKeyProxy.getActiveKey();

			if (keyInfo.format === 'no-prefix') {
				// No-prefix output must stay byte-compatible with the pre-rotation
				// format, which readers decrypt with the instance key directly.
				if (!this.verifiedLegacyDescriptors.has(keyInfo)) {
					if (
						this.decryptDEKWithInstanceKey(keyInfo.value) !== this.instanceSettings.encryptionKey ||
						keyInfo.algorithm !== 'aes-256-cbc'
					) {
						throw new UnexpectedError(
							'A no-prefix encryption descriptor must resolve to the instance key',
						);
					}
					this.verifiedLegacyDescriptors.add(keyInfo);
				}
				return this.encryptWithKey(plaintext, this.instanceSettings.encryptionKey, 'aes-256-cbc');
			}

			const plaintextKey = this.decryptDEKWithInstanceKey(keyInfo.value);
			const ciphertext = this.encryptWithKey(
				plaintext,
				plaintextKey,
				keyInfo.algorithm as CipherAlgorithm,
			);
			return `${keyInfo.id}:${ciphertext}`;
		}

		return this.encryptWithKey(plaintext, this.instanceSettings.encryptionKey, 'aes-256-cbc');
	}

	/**
	 * Decrypts data of either format: `keyId:ciphertext` resolves the key by id
	 * through the provider; ciphertext without a key-id prefix is legacy-format
	 * data and always decrypts with the instance key.
	 */
	async decryptV2(data: string, customEncryptionKey?: string): Promise<string> {
		if (customEncryptionKey !== undefined) {
			return this.decryptWithKey(data, customEncryptionKey, 'aes-256-cbc');
		}

		if (this.encryptionKeyProxy.isConfigured()) {
			const colonIdx = data.indexOf(':');
			if (colonIdx !== -1) {
				const keyId = data.slice(0, colonIdx);
				if (KEY_ID_PATTERN.test(keyId)) {
					const ciphertext = data.slice(colonIdx + 1);
					const keyInfo = await this.encryptionKeyProxy.getKeyById(keyId);
					if (!keyInfo) throw new UnexpectedError(`Encryption key not found: ${keyId}`);
					const plaintextKey = this.decryptDEKWithInstanceKey(keyInfo.value);
					return this.decryptWithKey(
						ciphertext,
						plaintextKey,
						keyInfo.algorithm as CipherAlgorithm,
					);
				}
			}
		}

		return this.decryptWithKey(data, this.instanceSettings.encryptionKey, 'aes-256-cbc');
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
