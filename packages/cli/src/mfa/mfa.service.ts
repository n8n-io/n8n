import { LicenseState, Logger } from '@n8n/backend-common';
import { PersonRepository, SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';
import { Cipher } from 'n8n-core';
import { v4 as uuid } from 'uuid';

import { InvalidMfaCodeError } from '@/errors/response-errors/invalid-mfa-code.error';
import { InvalidMfaRecoveryCodeError } from '@/errors/response-errors/invalid-mfa-recovery-code-error';
import { CacheService } from '@n8n/backend-services';

import { MFA_ENFORCE_SETTING } from './constants';
import { TOTPService } from './totp.service';

export const MFA_CACHE_KEY = 'mfa:enforce';
@Service()
export class MfaService {
	constructor(
		private personRepository: PersonRepository,
		private settingsRepository: SettingsRepository,
		private cacheService: CacheService,
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
		const value = (await this.settingsRepository.findByKey(MFA_ENFORCE_SETTING))?.value;
		await this.cacheService.set(MFA_CACHE_KEY, value);
		return value === 'true';
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
		await this.cacheService.set(MFA_CACHE_KEY, `${value}`);
	}

	async isMFAEnforced() {
		if (!this.license.isMFAEnforcementLicensed()) return false;

		const cachedValue = await this.cacheService.get(MFA_CACHE_KEY);

		return cachedValue ? cachedValue === 'true' : await this.loadMFASettings();
	}

	async saveSecretAndRecoveryCodes(userId: string, secret: string, recoveryCodes: string[]) {
		const { encryptedSecret, encryptedRecoveryCodes } = await this.encryptSecretAndRecoveryCodes(
			secret,
			recoveryCodes,
		);

		const person = await this.getPerson(userId);
		person.mfaSecret = encryptedSecret;
		person.mfaRecoveryCodes = encryptedRecoveryCodes;
		await this.personRepository.save(person);
	}

	async encryptSecretAndRecoveryCodes(rawSecret: string, rawRecoveryCodes: string[]) {
		const encryptedSecret = await this.cipher.encryptV2(rawSecret);
		const encryptedRecoveryCodes = await Promise.all(
			rawRecoveryCodes.map(async (code) => await this.cipher.encryptV2(code)),
		);
		return {
			encryptedRecoveryCodes,
			encryptedSecret,
		};
	}

	private async decryptSecretAndRecoveryCodes(mfaSecret: string, mfaRecoveryCodes: string[]) {
		return {
			decryptedSecret: await this.cipher.decryptV2(mfaSecret),
			decryptedRecoveryCodes: await Promise.all(
				mfaRecoveryCodes.map(async (code) => await this.cipher.decryptV2(code)),
			),
		};
	}

	async getSecretAndRecoveryCodes(userId: string) {
		const { mfaSecret, mfaRecoveryCodes } = await this.getPerson(userId);
		return await this.decryptSecretAndRecoveryCodes(mfaSecret ?? '', mfaRecoveryCodes ?? []);
	}

	async validateMfa(
		userId: string,
		mfaCode: string | undefined,
		mfaRecoveryCode: string | undefined,
	) {
		const person = await this.getPerson(userId);
		if (mfaCode) {
			const decryptedSecret = await this.cipher.decryptV2(person.mfaSecret!);
			return this.totp.verifySecret({ secret: decryptedSecret, mfaCode });
		}

		if (mfaRecoveryCode) {
			const validCodes = await Promise.all(
				person.mfaRecoveryCodes.map(async (code) => await this.cipher.decryptV2(code)),
			);
			const index = validCodes.indexOf(mfaRecoveryCode);
			if (index === -1) return false;
			// remove used recovery code
			validCodes.splice(index, 1);
			person.mfaRecoveryCodes = await Promise.all(
				validCodes.map(async (code) => await this.cipher.encryptV2(code)),
			);
			await this.personRepository.save(person);
			return true;
		}

		return false;
	}

	async enableMfa(userId: string) {
		const person = await this.personRepository.findByIdWithRole(userId);
		if (!person) throw new NotFoundError('User not found');
		person.mfaEnabled = true;
		return await this.personRepository.save(person);
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
		await this.personRepository.disableMfa(userId);
	}

	/** MFA belongs to people. A service account id is not found. */
	private async getPerson(userId: string) {
		const person = await this.personRepository.findById(userId);
		if (!person) throw new NotFoundError('User not found');
		return person;
	}
}
