import { v4 as uuid } from 'uuid';
import { Service } from 'typedi';
import { Cipher } from 'n8n-core';

import type { User } from '@db/entities/User';
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
		const user = await this.userRepository.findOneByOrFail({ id: userId });
		user.mfaEnabled = true;
		await this.userRepository.save(user);
		return user;
	}

	public async disableMfa(userId: string) {
		const user = await this.userRepository.findOneByOrFail({ id: userId });
		user.mfaEnabled = false;
		user.mfaSecret = null;
		user.mfaRecoveryCodes = [];
		await this.userRepository.save(user);
		return user;
	}

	async validateMfa(user: User, mfaToken: string | undefined, mfaRecoveryCode: string | undefined) {
		const { decryptedRecoveryCodes, decryptedSecret } = await this.getSecretAndRecoveryCodes(
			user.id,
		);

		user.mfaRecoveryCodes = decryptedRecoveryCodes;
		return mfaToken
			? await this.validateMfaToken(mfaToken, decryptedSecret)
			: await this.validateMfaRecoveryCode(user, mfaRecoveryCode);
	}

	private async validateMfaToken(token: string, secret: string) {
		return this.totp.verifySecret({ secret, token });
	}

	private async validateMfaRecoveryCode(user: User, mfaRecoveryCode?: string) {
		if (!mfaRecoveryCode) return false;
		const { mfaRecoveryCodes: validCodes } = user;
		const index = validCodes.indexOf(mfaRecoveryCode);
		if (index === -1) return false;

		// remove used recovery code
		validCodes.splice(index, 1);
		user.mfaRecoveryCodes = validCodes.map((code) => this.cipher.encrypt(code));
		await this.userRepository.save(user);

		return true;
	}
}
