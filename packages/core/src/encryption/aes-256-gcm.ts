import { Service } from '@n8n/di';
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'crypto';
import { UnexpectedError } from 'n8n-workflow';

import { CipherWrapper } from './interface';

const FORMAT_VERSION = 0x01;

// Changing this value invalidates every ciphertext previously produced with it.
// Introduce a new FORMAT_VERSION alongside any change.
const HKDF_INFO = 'n8n-encryption-v1';

const KEY_LENGTH_BYTES = 32;
const SALT_LENGTH_BYTES = 32;
const IV_LENGTH_BYTES = 12;
const AUTH_TAG_LENGTH_BYTES = 16;
const HKDF_OUTPUT_LENGTH_BYTES = KEY_LENGTH_BYTES + IV_LENGTH_BYTES;

const VERSION_OFFSET = 0;
const SALT_OFFSET = VERSION_OFFSET + 1;
const AUTH_TAG_OFFSET = SALT_OFFSET + SALT_LENGTH_BYTES;
const CIPHERTEXT_OFFSET = AUTH_TAG_OFFSET + AUTH_TAG_LENGTH_BYTES;
const MIN_CIPHERTEXT_LENGTH_BYTES = CIPHERTEXT_OFFSET;

@Service()
export class CipherAes256GCM implements CipherWrapper {
	encrypt(data: string, key: string): string {
		const keyBuf = this.toKeyBuf(key);
		const salt = randomBytes(SALT_LENGTH_BYTES);
		const [derivedKey, iv] = this.deriveKeyAndIv(keyBuf, salt);
		const cipher = createCipheriv('aes-256-gcm', derivedKey, iv);
		const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
		const authTag = cipher.getAuthTag();
		const version = Buffer.from([FORMAT_VERSION]);
		return Buffer.concat([version, salt, authTag, encrypted]).toString('base64');
	}

	decrypt(data: string, key: string): string {
		const keyBuf = this.toKeyBuf(key);
		const buf = Buffer.from(data, 'base64');
		if (buf.length < MIN_CIPHERTEXT_LENGTH_BYTES) {
			throw new UnexpectedError('GCM ciphertext too short');
		}
		const version = buf[VERSION_OFFSET];
		if (version !== FORMAT_VERSION) {
			throw new UnexpectedError(`Unsupported GCM ciphertext version: ${version}`);
		}
		const salt = buf.subarray(SALT_OFFSET, AUTH_TAG_OFFSET);
		const authTag = buf.subarray(AUTH_TAG_OFFSET, CIPHERTEXT_OFFSET);
		const ciphertext = buf.subarray(CIPHERTEXT_OFFSET);
		const [derivedKey, iv] = this.deriveKeyAndIv(keyBuf, salt);
		const decipher = createDecipheriv('aes-256-gcm', derivedKey, iv, {
			authTagLength: AUTH_TAG_LENGTH_BYTES,
		});
		decipher.setAuthTag(authTag);
		return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
	}

	private toKeyBuf(key: string): Buffer {
		const buf = Buffer.from(key, 'hex');
		if (buf.length !== KEY_LENGTH_BYTES) {
			throw new UnexpectedError('GCM key must be exactly 32 bytes (64 hex characters)');
		}
		return buf;
	}

	private deriveKeyAndIv(keyBuf: Buffer, salt: Buffer): [Buffer, Buffer] {
		const derived = Buffer.from(
			hkdfSync('sha256', keyBuf, salt, HKDF_INFO, HKDF_OUTPUT_LENGTH_BYTES),
		);
		return [derived.subarray(0, KEY_LENGTH_BYTES), derived.subarray(KEY_LENGTH_BYTES)];
	}
}
