import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { AuthIdentity, Person } from '@n8n/db';
import { Service } from '@n8n/di';

import { BadRequestError, ForbiddenError } from '@n8n/errors';
import { InvalidMfaCodeError } from '@/errors/response-errors/invalid-mfa-code.error';
import { MfaService } from '@/mfa/mfa.service';
import { PasswordUtility } from '@/services/password.utility';
import { UserService } from '@/services/user.service';
import { getCurrentAuthenticationMethod, isSamlLicensedAndEnabled } from '@/sso.ee/sso-helpers';

/**
 * Shared guards for the email-change flow. Used at request time (with re-auth)
 * and re-run at confirm time (guards only) so a token minted before the instance
 * state changed cannot be applied.
 */
@Service()
export class EmailChangeService {
	constructor(
		private readonly logger: Logger,
		private readonly userService: UserService,
		private readonly mfaService: MfaService,
		private readonly passwordUtility: PasswordUtility,
		private readonly globalConfig: GlobalConfig,
	) {}

	/** The owner account is managed via environment variables and is immutable through the API. */
	isManagedByEnv(person: Person): boolean {
		const { instanceSettingsLoader } = this.globalConfig;
		return (
			instanceSettingsLoader.ownerManagedByEnv &&
			!!person.email &&
			person.email.toLowerCase() === instanceSettingsLoader.ownerEmail.toLowerCase()
		);
	}

	/**
	 * Guards that must hold for an email change regardless of re-authentication:
	 * env-managed owner, an active SSO identity, or SAML. Run at both request and
	 * confirm time.
	 */
	async assertMayApplyEmailChange(person: Person): Promise<void> {
		if (this.isManagedByEnv(person)) {
			throw new ForbiddenError(
				'This account is managed via environment variables and cannot be modified through the API',
			);
		}

		const ssoIdentity = await this.userService.findSsoIdentity(person.id);
		if (ssoIdentity && this.isAuthIdentityActive(ssoIdentity)) {
			this.logger.debug(
				`Request to change email failed because ${ssoIdentity.providerType} user may not change their profile information`,
				{ userId: person.id },
			);
			throw new BadRequestError(
				`${ssoIdentity.providerType.toUpperCase()} user may not change their profile information`,
			);
		}

		if (isSamlLicensedAndEnabled()) {
			this.logger.debug(
				'Request to change email failed because SAML user may not change their email',
				{ userId: person.id },
			);
			throw new BadRequestError('SAML user may not change their email');
		}
	}

	/**
	 * Request-time gate: the guards plus re-authentication. Requires the current
	 * password when MFA is disabled, or a valid MFA code when it is enabled.
	 */
	async assertMayRequestEmailChange(
		person: Person,
		{ currentPassword, mfaCode }: { currentPassword?: string; mfaCode?: string },
	): Promise<void> {
		await this.assertMayApplyEmailChange(person);

		if (person.mfaEnabled) {
			if (!mfaCode) {
				throw new BadRequestError('Two-factor code is required to change email');
			}
			const isMfaCodeValid = await this.mfaService.validateMfa(person.id, mfaCode, undefined);
			if (!isMfaCodeValid) {
				throw new InvalidMfaCodeError();
			}
			return;
		}

		if (person.password === null) {
			// SSO-provisioned users without a local password have no password to confirm.
			this.logger.debug('User with no password changed their email', { userId: person.id });
			return;
		}

		if (!currentPassword || typeof currentPassword !== 'string') {
			throw new BadRequestError('Current password is required to change email');
		}

		const isProvidedPasswordCorrect = await this.passwordUtility.compare(
			currentPassword,
			person.password,
		);
		if (!isProvidedPasswordCorrect) {
			throw new BadRequestError(
				'Unable to update profile. Please check your credentials and try again.',
			);
		}
	}

	private isAuthIdentityActive(authIdentity: AuthIdentity): boolean {
		return authIdentity.providerType === getCurrentAuthenticationMethod();
	}
}
