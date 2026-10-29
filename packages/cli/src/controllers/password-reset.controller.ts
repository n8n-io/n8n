import {
	ChangePasswordRequestDto,
	ForgotPasswordRequestDto,
	ResolvePasswordTokenQueryDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import { Time } from '@n8n/constants';
import { GLOBAL_OWNER_ROLE, PersonRepository } from '@n8n/db';
import {
	Body,
	createBodyKeyedRateLimiter,
	Get,
	Post,
	Query,
	RestController,
} from '@n8n/decorators';
import { hasGlobalScope } from '@n8n/permissions';
import { Response } from 'express';
import { ErrorReporter } from 'n8n-core';

import { AuthService } from '@/auth/auth.service';
import { RESPONSE_ERROR_MESSAGES } from '@/constants';
import {
	BadRequestError,
	ForbiddenError,
	InternalServerError,
	NotFoundError,
	UnprocessableRequestError,
} from '@n8n/errors';
import { ExternalHooks } from '@/external-hooks';
import { License } from '@/license';
import { MfaService } from '@/mfa/mfa.service';
import { createJitterMiddleware } from '@/middlewares';
import { AuthlessRequest } from '@/requests';
import { PasswordUtility } from '@/services/password.utility';
import { UserService } from '@/services/user.service';
import {
	isOidcCurrentAuthenticationMethod,
	isSamlCurrentAuthenticationMethod,
} from '@/sso.ee/sso-helpers';
import { UserManagementMailer } from '@/user-management/email';

@RestController()
export class PasswordResetController {
	constructor(
		private readonly logger: Logger,
		private readonly externalHooks: ExternalHooks,
		private readonly mailer: UserManagementMailer,
		private readonly authService: AuthService,
		private readonly userService: UserService,
		private readonly mfaService: MfaService,
		private readonly license: License,
		private readonly passwordUtility: PasswordUtility,
		private readonly personRepository: PersonRepository,
		private readonly eventService: EventService,
		private readonly errorReporter: ErrorReporter,
	) {}

	/**
	 * Send a password reset email.
	 */
	@Post('/forgot-password', {
		skipAuth: true,
		ipRateLimit: { limit: 20, windowMs: 5 * Time.minutes.toMilliseconds },
		keyedRateLimit: createBodyKeyedRateLimiter<ForgotPasswordRequestDto>({
			limit: 3,
			field: 'email',
		}),
		middlewares: [createJitterMiddleware({ minMs: 200, maxMs: 1000 })],
	})
	async forgotPassword(
		_req: AuthlessRequest,
		_res: Response,
		@Body payload: ForgotPasswordRequestDto,
	) {
		if (!this.mailer.isEmailSetUp) {
			this.logger.debug(
				'Request to send password reset email failed because emailing was not set up',
			);
			throw new InternalServerError(
				'Email sending must be set up in order to request a password reset email',
			);
		}

		try {
			const { email } = payload;

			// User should just be able to reset password if one is already present
			const person = await this.personRepository.findSetUpByEmail(email);
			if (!person) {
				this.logger.debug('No user found in the system');
				return;
			}

			// oxlint-disable-next-line typescript/no-deprecated
			if (person.role.slug !== GLOBAL_OWNER_ROLE.slug && !this.license.isWithinUsersLimit()) {
				this.logger.debug(
					'Request to send password reset email failed because the user limit was reached',
				);
				throw new ForbiddenError(RESPONSE_ERROR_MESSAGES.USERS_QUOTA_REACHED);
			}

			if (
				(isSamlCurrentAuthenticationMethod() || isOidcCurrentAuthenticationMethod()) &&
				!(
					hasGlobalScope(person, 'user:resetPassword') ||
					person.settings?.allowSSOManualLogin === true
				)
			) {
				const currentAuthenticationMethod = isSamlCurrentAuthenticationMethod() ? 'SAML' : 'OIDC';
				this.logger.debug(
					`Request to send password reset email failed because login is handled by ${currentAuthenticationMethod}`,
				);
				throw new ForbiddenError(
					`Login is handled by ${currentAuthenticationMethod}. Please contact your Identity Provider to reset your password.`,
				);
			}

			const ldapIdentity = person.authIdentities?.find((i) => i.providerType === 'ldap');
			if (!person.password || (ldapIdentity && person.disabled)) {
				this.logger.debug(
					'Request to send password reset email failed because no user was found for the provided email',
					{ invalidEmail: email },
				);
				return;
			}

			// oxlint-disable-next-line typescript/no-deprecated
			if (this.license.isLdapEnabled() && ldapIdentity) {
				throw new UnprocessableRequestError('forgotPassword.ldapUserPasswordResetUnavailable');
			}

			const url = this.authService.generatePasswordResetUrl(person);

			const { id, firstName } = person;
			try {
				await this.mailer.passwordReset({
					email,
					firstName,
					passwordResetUrl: url,
				});
			} catch (error) {
				this.eventService.emit('email-failed', {
					user: person,
					messageType: 'Reset password',
					publicApi: false,
				});
				if (error instanceof Error) {
					throw new InternalServerError(
						`Please contact your administrator: ${error.message}`,
						error,
					);
				}
			}

			this.logger.info('Sent password reset email successfully', { userId: person.id, email });
			this.eventService.emit('user-transactional-email-sent', {
				userId: id,
				messageType: 'Reset password',
				publicApi: false,
			});

			this.eventService.emit('user-password-reset-request-click', { user: person });
		} catch (error) {
			// Catch any unexpected errors to prevent information leakage
			this.errorReporter.error(
				new Error('Unexpected error in forgot password endpoint', { cause: error }),
			);
		}
	}

	/**
	 * Verify password reset token and user ID.
	 */
	@Get('/resolve-password-token', { skipAuth: true, ipRateLimit: true })
	async resolvePasswordToken(
		_req: AuthlessRequest,
		_res: Response,
		@Query payload: ResolvePasswordTokenQueryDto,
	) {
		const { token } = payload;
		const person = await this.authService.resolvePasswordResetToken(token);
		if (!person) throw new NotFoundError('');

		// oxlint-disable-next-line typescript/no-deprecated
		if (person.role.slug !== GLOBAL_OWNER_ROLE.slug && !this.license.isWithinUsersLimit()) {
			this.logger.debug(
				'Request to resolve password token failed because the user limit was reached',
				{ userId: person.id },
			);
			throw new ForbiddenError(RESPONSE_ERROR_MESSAGES.USERS_QUOTA_REACHED);
		}

		this.logger.info('Reset-password token resolved successfully', { userId: person.id });
		this.eventService.emit('user-password-reset-email-click', { user: person });
	}

	/**
	 * Verify password reset token and update password.
	 */
	@Post('/change-password', {
		skipAuth: true,
		ipRateLimit: true,
	})
	async changePassword(
		req: AuthlessRequest,
		res: Response,
		@Body payload: ChangePasswordRequestDto,
	) {
		const { token, password, mfaCode } = payload;

		const person = await this.authService.resolvePasswordResetToken(token);
		if (!person) throw new NotFoundError('');

		if (person.mfaEnabled) {
			if (!mfaCode) throw new BadRequestError('If MFA enabled, mfaCode is required.');

			const { decryptedSecret: secret } = await this.mfaService.getSecretAndRecoveryCodes(
				person.id,
			);

			const validToken = this.mfaService.totp.verifySecret({ secret, mfaCode });

			if (!validToken) throw new BadRequestError('Invalid MFA token.');
		}

		const passwordHash = await this.passwordUtility.hash(password);

		await this.userService.update(person.id, { password: passwordHash });

		this.logger.info('User password updated successfully', { userId: person.id });

		this.authService.issueCookie(res, person, person.mfaEnabled, req.browserId);

		this.eventService.emit('user-updated', { user: person, fieldsChanged: ['password'] });

		// if this user used to be an LDAP user
		const ldapIdentity = person?.authIdentities?.find((i) => i.providerType === 'ldap');
		if (ldapIdentity) {
			this.eventService.emit('user-signed-up', {
				user: person,
				userType: 'email',
				wasDisabledLdapUser: true,
			});
		}

		await this.externalHooks.run('user.password.update', [person.email, passwordHash]);
	}
}
