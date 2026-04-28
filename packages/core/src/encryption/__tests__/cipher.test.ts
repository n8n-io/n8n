import { Container } from '@n8n/di';

import { InstanceSettings } from '@/instance-settings';
import { mockInstance } from '@test/utils';

import { Cipher } from '../cipher';

describe('Cipher', () => {
	mockInstance(InstanceSettings, { encryptionKey: 'test_key' });
	const cipher = Container.get(Cipher);

	describe('encrypt', () => {
		it('should encrypt strings', () => {
			const encrypted = cipher.encrypt('random-string');
			const decrypted = cipher.decrypt(encrypted);
			expect(decrypted).toEqual('random-string');
		});

		it('should encrypt objects', () => {
			const encrypted = cipher.encrypt({ key: 'value' });
			const decrypted = cipher.decrypt(encrypted);
			expect(decrypted).toEqual('{"key":"value"}');
		});
	});

	describe('decrypt', () => {
		it('should decrypt string', () => {
			const decrypted = cipher.decrypt('U2FsdGVkX194VEoX27o3+y5jUd1JTTmVwkOKjVhB6Jg=');
			expect(decrypted).toEqual('random-string');
		});

		it('should not try to decrypt if the input is shorter than 16 bytes', () => {
			const decrypted = cipher.decrypt('U2FsdGVkX194VEo');
			expect(decrypted).toEqual('');
		});
	});

	describe('encryptWithInstanceKey / decryptWithInstanceKey', () => {
		it('should roundtrip strings using the instance key regardless of custom args', () => {
			const encrypted = cipher.encryptWithInstanceKey('random-string');
			expect(cipher.decryptWithInstanceKey(encrypted)).toEqual('random-string');
		});

		it('should JSON-stringify objects before encrypting', () => {
			const encrypted = cipher.encryptWithInstanceKey({ key: 'value' });
			expect(cipher.decryptWithInstanceKey(encrypted)).toEqual('{"key":"value"}');
		});

		it('should produce ciphertext that is interoperable with decryptWithKey(instance-key)', () => {
			const encrypted = cipher.encryptWithInstanceKey('random-string');
			expect(cipher.decryptWithKey(encrypted, 'test_key', 'aes-256-cbc')).toEqual('random-string');
		});

		it('should fail to decrypt with a non-instance key', () => {
			const encrypted = cipher.encryptWithInstanceKey('random-string');
			expect(() => cipher.decryptWithKey(encrypted, 'some-other-key', 'aes-256-cbc')).toThrow();
		});
	});

	describe('encryptWithKey', () => {
		it('should roundtrip with decryptWithKey using the same key', () => {
			const encrypted = cipher.encryptWithKey('random-string', 'explicit-key', 'aes-256-cbc');
			const decrypted = cipher.decryptWithKey(encrypted, 'explicit-key', 'aes-256-cbc');
			expect(decrypted).toEqual('random-string');
		});

		it('should produce different ciphertexts for the same plaintext on successive calls', () => {
			const first = cipher.encryptWithKey('random-string', 'explicit-key', 'aes-256-cbc');
			const second = cipher.encryptWithKey('random-string', 'explicit-key', 'aes-256-cbc');
			expect(first).not.toEqual(second);
		});

		it('should fail to decrypt with a different key', () => {
			const encrypted = cipher.encryptWithKey('random-string', 'key-a', 'aes-256-cbc');
			expect(() => cipher.decryptWithKey(encrypted, 'key-b', 'aes-256-cbc')).toThrow();
		});

		it('should be interoperable with legacy encrypt when given the same key', () => {
			const encrypted = cipher.encrypt('random-string', 'shared-key');
			const decrypted = cipher.decryptWithKey(encrypted, 'shared-key', 'aes-256-cbc');
			expect(decrypted).toEqual('random-string');
		});
	});

	describe('encryptWithKey / decryptWithKey — aes-256-gcm', () => {
		const gcmKey = '11'.repeat(32);
		const otherGcmKey = '22'.repeat(32);

		// Ciphertext layout: version(1) || salt(32) || authTag(16) || ciphertext(...)
		const VERSION_OFFSET = 0;
		const SALT_OFFSET = 1;
		const AUTH_TAG_OFFSET = 33;
		const CIPHERTEXT_OFFSET = 49;

		it('should roundtrip with decryptWithKey using the same key', () => {
			const encrypted = cipher.encryptWithKey('random-string', gcmKey, 'aes-256-gcm');
			const decrypted = cipher.decryptWithKey(encrypted, gcmKey, 'aes-256-gcm');
			expect(decrypted).toEqual('random-string');
		});

		it('should roundtrip an empty string', () => {
			const encrypted = cipher.encryptWithKey('', gcmKey, 'aes-256-gcm');
			expect(cipher.decryptWithKey(encrypted, gcmKey, 'aes-256-gcm')).toEqual('');
		});

		it('should produce different ciphertexts for the same plaintext on successive calls', () => {
			const first = cipher.encryptWithKey('random-string', gcmKey, 'aes-256-gcm');
			const second = cipher.encryptWithKey('random-string', gcmKey, 'aes-256-gcm');
			expect(first).not.toEqual(second);
		});

		it('should fail to decrypt with a different key', () => {
			const encrypted = cipher.encryptWithKey('random-string', gcmKey, 'aes-256-gcm');
			expect(() => cipher.decryptWithKey(encrypted, otherGcmKey, 'aes-256-gcm')).toThrow();
		});

		it.each([
			{ region: 'salt', offset: SALT_OFFSET + 4 },
			{ region: 'auth tag', offset: AUTH_TAG_OFFSET + 7 },
			{ region: 'ciphertext body', offset: CIPHERTEXT_OFFSET + 1 },
		])('should throw when the $region has been tampered with', ({ offset }) => {
			const encrypted = cipher.encryptWithKey('some-longer-plaintext', gcmKey, 'aes-256-gcm');
			const buf = Buffer.from(encrypted, 'base64');
			buf[offset] = buf[offset] ^ 0x01;
			const tampered = buf.toString('base64');
			expect(() => cipher.decryptWithKey(tampered, gcmKey, 'aes-256-gcm')).toThrow();
		});

		it('should throw when a CBC ciphertext is fed into the GCM decryption path', () => {
			const cbcCiphertext = cipher.encryptWithKey('random-string', gcmKey, 'aes-256-cbc');
			expect(() => cipher.decryptWithKey(cbcCiphertext, gcmKey, 'aes-256-gcm')).toThrow();
		});

		it('should throw before any cipher operation when the key is not 32 bytes', () => {
			const shortKey = '00'.repeat(31);
			const expectedError = 'GCM key must be exactly 32 bytes (64 hex characters)';
			expect(() => cipher.encryptWithKey('random-string', shortKey, 'aes-256-gcm')).toThrow(
				expectedError,
			);
			expect(() => cipher.decryptWithKey('irrelevant', shortKey, 'aes-256-gcm')).toThrow(
				expectedError,
			);
		});

		it('should throw when ciphertext is shorter than the minimum header size', () => {
			// version(1) || salt(32) || truncated tag(4) = 37 bytes, below the 49-byte minimum
			const truncated = Buffer.concat([Buffer.from([0x01]), Buffer.alloc(32), Buffer.alloc(4)]);
			expect(() =>
				cipher.decryptWithKey(truncated.toString('base64'), gcmKey, 'aes-256-gcm'),
			).toThrow('GCM ciphertext too short');
		});

		it('should throw when given an empty ciphertext', () => {
			expect(() => cipher.decryptWithKey('', gcmKey, 'aes-256-gcm')).toThrow(
				'GCM ciphertext too short',
			);
		});

		it('should throw when ciphertext has an unsupported version byte', () => {
			const encrypted = cipher.encryptWithKey('random-string', gcmKey, 'aes-256-gcm');
			const buf = Buffer.from(encrypted, 'base64');
			buf[VERSION_OFFSET] = 0xff;
			expect(() => cipher.decryptWithKey(buf.toString('base64'), gcmKey, 'aes-256-gcm')).toThrow(
				'Unsupported GCM ciphertext version',
			);
		});
	});
});
