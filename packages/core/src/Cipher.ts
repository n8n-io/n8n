import { Service } from 'typedi';
import { AES, enc } from 'crypto-js';
import { InstanceSettings } from './InstanceSettings';

@Service()
export class Cipher {
	constructor(private readonly instanceSettings: InstanceSettings) {}

	encrypt(data: string | object) {
		const { encryptionKey } = this.instanceSettings;
		return AES.encrypt(
			typeof data === 'string' ? data : JSON.stringify(data),
			encryptionKey,
		).toString();
	}

	decrypt(data: string) {
		const { encryptionKey } = this.instanceSettings;
		return AES.decrypt(data, encryptionKey).toString(enc.Utf8);
	}
}
