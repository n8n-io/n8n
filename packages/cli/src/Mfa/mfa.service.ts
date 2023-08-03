import { v4 as uuid } from 'uuid';
import { AES, enc } from 'crypto-js';
import { Repository } from 'typeorm';
import type { User } from '@db/entities/User';
import { TOTPService } from './totp.service';
import { Service } from 'typedi';

@Service()
export class MfaService {
	constructor(
		private userRepository: Repository<User>,
		public totp: TOTPService,
		private encryptionKey: string,
	) {}

	public generateRawRecoveryCodes() {
		return Array.from(Array(10)).map(() => uuid());
	}

	public generateEncryptedRecoveryCodes() {
		return this.generateRawRecoveryCodes().map((code) =>
			AES.encrypt(code, this.encryptionKey).toString(),
		);
	}

	public async saveSecretAndRecoveryCodes(userId: string, secret: string, recoveryCodes: string[]) {
		const encryptedSecret = AES.encrypt(secret, this.encryptionKey).toString(),
			encryptedRecoveryCodes = recoveryCodes.map((code) =>
				AES.encrypt(code, this.encryptionKey).toString(),
			);
		return this.userRepository.update(userId, {
			mfaSecret: encryptedSecret,
			mfaRecoveryCodes: encryptedRecoveryCodes,
		});
	}

	private decryptSecretAndRecoveryCodes(mfaSecret: string, mfaRecoveryCodes: string[]) {
		return {
			decryptedSecret: AES.decrypt(mfaSecret, this.encryptionKey).toString(enc.Utf8),
			decryptedRecoveryCodes: mfaRecoveryCodes.map((code) =>
				AES.decrypt(code, this.encryptionKey).toString(enc.Utf8),
			),
		};
	}

	public async getRawSecretAndRecoveryCodes(userId: string) {
		const { mfaSecret, mfaRecoveryCodes } = await this.userRepository.findOneOrFail({
			where: { id: userId },
			select: ['id', 'mfaSecret', 'mfaRecoveryCodes'],
		});
		return this.decryptSecretAndRecoveryCodes(mfaSecret ?? '', mfaRecoveryCodes ?? []);
	}

	public async enableMfa(userId: string) {
		await this.userRepository.update(userId, { mfaEnabled: true });
	}

	public async disableMfa(userId: string) {
		await this.userRepository.update(userId, {
			mfaEnabled: false,
			mfaSecret: null,
			mfaRecoveryCodes: [],
		});
	}
}
