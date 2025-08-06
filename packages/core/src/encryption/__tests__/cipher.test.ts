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
});
