import Container from 'typedi';
import { InstanceSettings } from '@/InstanceSettings';
import { Cipher } from '@/Cipher';
import { mockInstance } from './utils';

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
	});
});
