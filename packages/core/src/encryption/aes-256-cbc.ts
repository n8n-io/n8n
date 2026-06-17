import { Service } from '@n8n/di';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

import { CipherWrapper } from './interface';

const RANDOM_BYTES = Buffer.from('53616c7465645f5f', 'hex');

@Service()
export class CipherAes256CBC implements CipherWrapper {
	encrypt(data: string, key: string): string {
		const salt = randomBytes(8);
		const [derivedKey, iv] = this.getKeyAndIv(salt, key);
		const cipher = createCipheriv('aes-256-cbc', derivedKey, iv);
		const encrypted = cipher.update(data);
		return Buffer.concat([RANDOM_BYTES, salt, encrypted, cipher.final()]).toString('base64');
	}

	decrypt(data: string, key: string): string {
		const input = Buffer.from(data, 'base64');
		if (input.length < 16) return '';
		const salt = input.subarray(8, 16);
		const [derivedKey, iv] = this.getKeyAndIv(salt, key);
		const contents = input.subarray(16);
		const decipher = createDecipheriv('aes-256-cbc', derivedKey, iv);
		return Buffer.concat([decipher.update(contents), decipher.final()]).toString('utf-8');
	}

	private getKeyAndIv(salt: Buffer, key: string): [Buffer, Buffer] {
		const password = Buffer.concat([Buffer.from(key, 'binary'), salt]);
		const hash1 = createHash('md5').update(password).digest();
		const hash2 = createHash('md5')
			.update(Buffer.concat([hash1, password]))
			.digest();
		const iv = createHash('md5')
			.update(Buffer.concat([hash2, password]))
			.digest();
		const derivedKey = Buffer.concat([hash1, hash2]);
		return [derivedKey, iv];
	}
}
