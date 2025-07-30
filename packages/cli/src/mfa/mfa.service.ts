import { LicenseState, Logger } from '@n8n/backend-common';
import { SettingsRepository, UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { Cipher } from 'n8n-core';
import { v4 as uuid } from 'uuid';

import { InvalidMfaCodeError } from '@/errors/response-errors/invalid-mfa-code.error';
import { InvalidMfaRecoveryCodeError } from '@/errors/response-errors/invalid-mfa-recovery-code-error';

import { MFA_ENFORCE_SETTING } from './constants';
import { TOTPService } from './totp.service';

@Service()
export class MfaService {
	private enforceMFAValue: boolean = false;

	constructor(
		private userRepository: UserRepository,
		private settingsRepository: SettingsRepository,
		private license: LicenseState,
		public totp: TOTPService,
		private cipher: Cipher,
		private logger: Logger,
	) {}

	async init() {
		try {
			await this.loadMFASettings();
		} catch (error) {
			this.logger.warn('Failed to load MFA settings', { error });
		}
	}

	generateRecoveryCodes(n = 10) {
		return Array.from(Array(n)).map(() => uuid());
	}

	private async loadMFASettings() {
		const value = await this.settingsRepository.findByKey(MFA_ENFORCE_SETTING);
		if (value) {
			this.enforceMFAValue = value.value === 'true';
		}
	}

	async enforceMFA(value: boolean) {
		if (!this.license.isMFAEnforcementLicensed()) {
			value = false; // If the license does not allow MFA enforcement, set it to false
		}
		await this.settingsRepository.upsert(
			{
				key: MFA_ENFORCE_SETTING,
				value: `${value}`,
				loadOnStartup: true,
			},
			['key'],
		);
		this.enforceMFAValue = value;
	}

	isMFAEnforced() {
		return this.license.isMFAEnforcementLicensed() && this.enforceMFAValue;
	}

	async saveSecretAndRecoveryCodes(userId: string, secret: string, recoveryCodes: string[]) {
		const { encryptedSecret, encryptedRecoveryCodes } = this.encryptSecretAndRecoveryCodes(
			secret,
			recoveryCodes,
		);

		const user = await this.userRepository.findOneByOrFail({ id: userId });
		user.mfaSecret = encryptedSecret;
		user.mfaRecoveryCodes = encryptedRecoveryCodes;
		await this.userRepository.save(user);
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
		const { mfaSecret, mfaRecoveryCodes } = await this.userRepository.findOneByOrFail({
			id: userId,
		});
		return this.decryptSecretAndRecoveryCodes(mfaSecret ?? '', mfaRecoveryCodes ?? []);
	}

	async validateMfa(
		userId: string,
		mfaCode: string | undefined,
		mfaRecoveryCode: string | undefined,
	) {
		const user = await this.userRepository.findOneByOrFail({ id: userId });
		if (mfaCode) {
			const decryptedSecret = this.cipher.decrypt(user.mfaSecret!);
			return this.totp.verifySecret({ secret: decryptedSecret, mfaCode });
		}

		if (mfaRecoveryCode) {
			const validCodes = user.mfaRecoveryCodes.map((code) => this.cipher.decrypt(code));
			const index = validCodes.indexOf(mfaRecoveryCode);
			if (index === -1) return false;
			// remove used recovery code
			validCodes.splice(index, 1);
			user.mfaRecoveryCodes = validCodes.map((code) => this.cipher.encrypt(code));
			await this.userRepository.save(user);
			return true;
		}

		return false;
	}

	async enableMfa(userId: string) {
		const user = await this.userRepository.findOneByOrFail({ id: userId });
		user.mfaEnabled = true;
		return await this.userRepository.save(user);
	}

	async disableMfaWithMfaCode(userId: string, mfaCode: string) {
		const isValidToken = await this.validateMfa(userId, mfaCode, undefined);

		if (!isValidToken) {
			throw new InvalidMfaCodeError();
		}

		await this.disableMfaForUser(userId);
	}

	async disableMfaWithRecoveryCode(userId: string, recoveryCode: string) {
		const isValidToken = await this.validateMfa(userId, undefined, recoveryCode);

		if (!isValidToken) {
			throw new InvalidMfaRecoveryCodeError();
		}

		await this.disableMfaForUser(userId);
	}

	private async disableMfaForUser(userId: string) {
		await this.userRepository.update(userId, {
			mfaEnabled: false,
			mfaSecret: null,
			mfaRecoveryCodes: [],
		});
	}
}
