import { Service } from 'typedi';
import { AES, enc } from 'crypto-js';
import { InstanceSettings } from './InstanceSettings';

@Service()
export class Cipher {
	constructor(private instanceSettings: InstanceSettings) {}

	encrypt(data: string) {
		return AES.encrypt(data, this.instanceSettings.encryptionKey).toString();
	}

	decrypt(data: string) {
		return AES.decrypt(data, this.instanceSettings.encryptionKey).toString(enc.Utf8);
	}
}
