import { Service } from 'typedi';
import { AES, enc } from 'crypto-js';
import { InstanceSettings } from './InstanceSettings';

@Service()
export class Cipher {
	constructor(private readonly instanceSettings: InstanceSettings) {}

	encrypt(data: string | object) {
		return AES.encrypt(
			typeof data === 'string' ? data : JSON.stringify(data),
			this.instanceSettings.encryptionKey,
		).toString();
	}

	decrypt(data: string) {
		return AES.decrypt(data, this.instanceSettings.encryptionKey).toString(enc.Utf8);
	}
}
