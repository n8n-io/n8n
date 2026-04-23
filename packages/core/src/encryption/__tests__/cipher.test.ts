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

		it('should throw on aes-256-gcm for encryptWithKey', () => {
			expect(() => cipher.encryptWithKey('data', 'key', 'aes-256-gcm')).toThrow(
				'GCM not yet implemented',
			);
		});

		it('should throw on aes-256-gcm for decryptWithKey', () => {
			expect(() => cipher.decryptWithKey('data', 'key', 'aes-256-gcm')).toThrow(
				'GCM not yet implemented',
			);
		});

		it('should be interoperable with legacy encrypt when given the same key', () => {
			const encrypted = cipher.encrypt('random-string', 'shared-key');
			const decrypted = cipher.decryptWithKey(encrypted, 'shared-key', 'aes-256-cbc');
			expect(decrypted).toEqual('random-string');
		});
	});

	describe('getKeyAndIv', () => {
		it('should generate a key and iv using instance settings encryption key', () => {
			const salt = Buffer.from('test-salt');
			mockInstance(InstanceSettings, { encryptionKey: 'settings-encryption-key' });
			// Clear the cached Cipher instance to get a new one with the new mock
			Container.set(Cipher, new Cipher(Container.get(InstanceSettings)));
			const testCipher = Container.get(Cipher);
			const bufferFromSpy = jest.spyOn(Buffer, 'from');
			// @ts-expect-error - getKeyAndIv is private
			const [key, iv] = testCipher.getKeyAndIv(salt);
			expect(key).toBeInstanceOf(Buffer);
			expect(iv).toBeInstanceOf(Buffer);
			expect(bufferFromSpy).toHaveBeenCalledWith('settings-encryption-key', 'binary');
			bufferFromSpy.mockRestore();
		});

		it('should generate a key and iv using custom encryption key', () => {
			const salt = Buffer.from('test-salt');
			mockInstance(InstanceSettings, { encryptionKey: 'settings-encryption-key' });
			// Clear the cached Cipher instance to get a new one with the new mock
			Container.set(Cipher, new Cipher(Container.get(InstanceSettings)));
			const testCipher = Container.get(Cipher);
			const bufferFromSpy = jest.spyOn(Buffer, 'from');
			// @ts-expect-error - getKeyAndIv is private
			const [key, iv] = testCipher.getKeyAndIv(salt, 'custom-encryption-key');
			expect(key).toBeInstanceOf(Buffer);
			expect(iv).toBeInstanceOf(Buffer);
			expect(bufferFromSpy).toHaveBeenCalledWith('custom-encryption-key', 'binary');
			bufferFromSpy.mockRestore();
		});
	});
});
