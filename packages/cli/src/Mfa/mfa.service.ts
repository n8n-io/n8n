import { v4 as uuid } from 'uuid';
import { Service } from 'typedi';
import { Cipher } from 'n8n-core';
import { UserRepository } from '@db/repositories/user.repository';
import { TOTPService } from './totp.service';

@Service()
export class MfaService {
	constructor(
		private userRepository: UserRepository,
		public totp: TOTPService,
		private cipher: Cipher,
	) {}

	public generateRecoveryCodes(n = 10) {
		return Array.from(Array(n)).map(() => uuid());
	}

	public generateEncryptedRecoveryCodes() {
		return this.generateRecoveryCodes().map((code) => this.cipher.encrypt(code));
	}

	public async saveSecretAndRecoveryCodes(userId: string, secret: string, recoveryCodes: string[]) {
		const { encryptedSecret, encryptedRecoveryCodes } = this.encryptSecretAndRecoveryCodes(
			secret,
			recoveryCodes,
		);

		const user = await this.userRepository.findOneBy({ id: userId });
		if (user) {
			Object.assign(user, {
				mfaSecret: encryptedSecret,
				mfaRecoveryCodes: encryptedRecoveryCodes,
			});

			await this.userRepository.save(user);
		}
	}

	public encryptSecretAndRecoveryCodes(rawSecret: string, rawRecoveryCodes: string[]) {
		const encryptedSecret = this.cipher.encrypt(rawSecret),
			encryptedRecoveryCodes = rawRecoveryCodes.map((code) => this.cipher.encrypt(code));
		return {
			encryptedRecoveryCodes,
			encryptedSecret,
		};
	}

	private decryptSecretAndRecoveryCodes(mfaSecret: string, mfaRecoveryCodes: string[]) {
		return {
			decryptedSecret: this.cipher.decrypt(mfaSecret),
			decryptedRecoveryCodes: mfaRecoveryCodes.map((code) => this.cipher.decrypt(code)),
		};
	}

	public async getSecretAndRecoveryCodes(userId: string) {
		const { mfaSecret, mfaRecoveryCodes } = await this.userRepository.findOneOrFail({
			where: { id: userId },
			select: ['id', 'mfaSecret', 'mfaRecoveryCodes'],
		});
		return this.decryptSecretAndRecoveryCodes(mfaSecret ?? '', mfaRecoveryCodes ?? []);
	}

	public async enableMfa(userId: string) {
		const user = await this.userRepository.findOneBy({ id: userId });
		if (user) {
			user.mfaEnabled = true;

			await this.userRepository.save(user);
		}
	}

	public encryptRecoveryCodes(mfaRecoveryCodes: string[]) {
		return mfaRecoveryCodes.map((code) => this.cipher.encrypt(code));
	}

	public async disableMfa(userId: string) {
		const user = await this.userRepository.findOneBy({ id: userId });

		if (user) {
			Object.assign(user, {
				mfaEnabled: false,
				mfaSecret: null,
				mfaRecoveryCodes: [],
			});
			await this.userRepository.save(user);
		}
	}
}
