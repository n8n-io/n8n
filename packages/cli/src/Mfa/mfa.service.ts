import { v4 as uuid } from 'uuid';
import { Service } from 'typedi';
import { Cipher } from 'n8n-core';
import { AuthUserRepository } from '@db/repositories/authUser.repository';
import { TOTPService } from './totp.service';

@Service()
export class MfaService {
	constructor(
		private authUserRepository: AuthUserRepository,
		public totp: TOTPService,
		private cipher: Cipher,
	) {}

	generateRecoveryCodes(n = 10) {
		return Array.from(Array(n)).map(() => uuid());
	}

	async saveSecretAndRecoveryCodes(userId: string, secret: string, recoveryCodes: string[]) {
		const { encryptedSecret, encryptedRecoveryCodes } = this.encryptSecretAndRecoveryCodes(
			secret,
			recoveryCodes,
		);

		const user = await this.authUserRepository.findOneByOrFail({ id: userId });
		user.mfaSecret = encryptedSecret;
		user.mfaRecoveryCodes = encryptedRecoveryCodes;
		await this.authUserRepository.save(user);
	}

	encryptSecretAndRecoveryCodes(rawSecret: string, rawRecoveryCodes: string[]) {
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

	async getSecretAndRecoveryCodes(userId: string) {
		const { mfaSecret, mfaRecoveryCodes } = await this.authUserRepository.findOneByOrFail({
			id: userId,
		});
		return this.decryptSecretAndRecoveryCodes(mfaSecret ?? '', mfaRecoveryCodes ?? []);
	}

	async validateMfa(
		userId: string,
		mfaToken: string | undefined,
		mfaRecoveryCode: string | undefined,
	) {
		const user = await this.authUserRepository.findOneByOrFail({ id: userId });
		if (mfaToken) {
			const decryptedSecret = this.cipher.decrypt(user.mfaSecret!);
			return this.totp.verifySecret({ secret: decryptedSecret, token: mfaToken });
		} else if (mfaRecoveryCode) {
			const validCodes = user.mfaRecoveryCodes.map((code) => this.cipher.decrypt(code));
			const index = validCodes.indexOf(mfaRecoveryCode);
			if (index === -1) return false;
			// remove used recovery code
			validCodes.splice(index, 1);
			user.mfaRecoveryCodes = validCodes.map((code) => this.cipher.encrypt(code));
			await this.authUserRepository.save(user);
			return true;
		}
		return false;
	}

	async enableMfa(userId: string) {
		const user = await this.authUserRepository.findOneByOrFail({ id: userId });
		user.mfaEnabled = true;
		return await this.authUserRepository.save(user);
	}

	async disableMfa(userId: string) {
		const user = await this.authUserRepository.findOneByOrFail({ id: userId });
		user.mfaEnabled = false;
		user.mfaSecret = null;
		user.mfaRecoveryCodes = [];
		return await this.authUserRepository.save(user);
	}
}
