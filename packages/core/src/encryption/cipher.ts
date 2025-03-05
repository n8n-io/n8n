import { Service } from '@n8n/di';
import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'crypto';

import { InstanceSettings } from '@/instance-settings';

// Data encrypted by CryptoJS always starts with these bytes
const RANDOM_BYTES = Buffer.from('53616c7465645f5f', 'hex');

@Service()
export class Cipher {
	constructor(private readonly instanceSettings: InstanceSettings) {}

	encrypt(data: string | object) {
		const salt = randomBytes(8);
		const [key, iv] = this.getKeyAndIv(salt);
		const cipher = createCipheriv('aes-256-cbc', key, iv);
		const encrypted = cipher.update(typeof data === 'string' ? data : JSON.stringify(data));
		return Buffer.concat([RANDOM_BYTES, salt, encrypted, cipher.final()]).toString('base64');
	}

	decrypt(data: string) {
		const input = Buffer.from(data, 'base64');
		if (input.length < 16) return '';
		const salt = input.subarray(8, 16);
		const [key, iv] = this.getKeyAndIv(salt);
		const contents = input.subarray(16);
		const decipher = createDecipheriv('aes-256-cbc', key, iv);
		return Buffer.concat([decipher.update(contents), decipher.final()]).toString('utf-8');
	}

	private getKeyAndIv(salt: Buffer): [Buffer, Buffer] {
		const { encryptionKey } = this.instanceSettings;
		const password = Buffer.concat([Buffer.from(encryptionKey, 'binary'), salt]);
		const hash1 = createHash('md5').update(password).digest();
		const hash2 = createHash('md5')
			.update(Buffer.concat([hash1, password]))
			.digest();
		const iv = createHash('md5')
			.update(Buffer.concat([hash2, password]))
			.digest();
		const key = Buffer.concat([hash1, hash2]);
		return [key, iv];
	}
}
