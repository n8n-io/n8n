import {
	ChangePasswordRequestDto,
	ForgotPasswordRequestDto,
	ResolvePasswordTokenQueryDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { UserRepository } from '@n8n/db';
import { Body, Get, Post, Query, RestController } from '@n8n/decorators';
import { hasGlobalScope } from '@n8n/permissions';
import { Response } from 'express';

import { AuthService } from '@/auth/auth.service';
import { RESPONSE_ERROR_MESSAGES } from '@/constants';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { UnprocessableRequestError } from '@/errors/response-errors/unprocessable.error';
import { EventService } from '@/events/event.service';
import { ExternalHooks } from '@/external-hooks';
import { License } from '@/license';
import { MfaService } from '@/mfa/mfa.service';
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
		private readonly userRepository: UserRepository,
		private readonly eventService: EventService,
	) {}

	/**
	 * Send a password reset email.
	 */
	@Post('/forgot-password', { skipAuth: true, rateLimit: { limit: 3 } })
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

		const { email } = payload;

		// User should just be able to reset password if one is already present
		const user = await this.userRepository.findNonShellUser(email);
		if (!user) {
			this.logger.debug('No user found in the system');
			return;
		}

		if (user.role !== 'global:owner' && !this.license.isWithinUsersLimit()) {
			this.logger.debug(
				'Request to send password reset email failed because the user limit was reached',
			);
			throw new ForbiddenError(RESPONSE_ERROR_MESSAGES.USERS_QUOTA_REACHED);
		}

		if (
			(isSamlCurrentAuthenticationMethod() || isOidcCurrentAuthenticationMethod()) &&
			!(hasGlobalScope(user, 'user:resetPassword') || user.settings?.allowSSOManualLogin === true)
		) {
			const currentAuthenticationMethod = isSamlCurrentAuthenticationMethod() ? 'SAML' : 'OIDC';
			this.logger.debug(
				`Request to send password reset email failed because login is handled by ${currentAuthenticationMethod}`,
			);
			throw new ForbiddenError(
				`Login is handled by ${currentAuthenticationMethod}. Please contact your Identity Provider to reset your password.`,
			);
		}

		const ldapIdentity = user.authIdentities?.find((i) => i.providerType === 'ldap');
		if (!user.password || (ldapIdentity && user.disabled)) {
			this.logger.debug(
				'Request to send password reset email failed because no user was found for the provided email',
				{ invalidEmail: email },
			);
			return;
		}

		if (this.license.isLdapEnabled() && ldapIdentity) {
			throw new UnprocessableRequestError('forgotPassword.ldapUserPasswordResetUnavailable');
		}

		const url = this.authService.generatePasswordResetUrl(user);

		const { id, firstName } = user;
		try {
			await this.mailer.passwordReset({
				email,
				firstName,
				passwordResetUrl: url,
			});
		} catch (error) {
			this.eventService.emit('email-failed', {
				user,
				messageType: 'Reset password',
				publicApi: false,
			});
			if (error instanceof Error) {
				throw new InternalServerError(`Please contact your administrator: ${error.message}`, error);
			}
		}

		this.logger.info('Sent password reset email successfully', { userId: user.id, email });
		this.eventService.emit('user-transactional-email-sent', {
			userId: id,
			messageType: 'Reset password',
			publicApi: false,
		});

		this.eventService.emit('user-password-reset-request-click', { user });
	}

	/**
	 * Verify password reset token and user ID.
	 */
	@Get('/resolve-password-token', { skipAuth: true })
	async resolvePasswordToken(
		_req: AuthlessRequest,
		_res: Response,
		@Query payload: ResolvePasswordTokenQueryDto,
	) {
		const { token } = payload;
		const user = await this.authService.resolvePasswordResetToken(token);
		if (!user) throw new NotFoundError('');

		if (user.role !== 'global:owner' && !this.license.isWithinUsersLimit()) {
			this.logger.debug(
				'Request to resolve password token failed because the user limit was reached',
				{ userId: user.id },
			);
			throw new ForbiddenError(RESPONSE_ERROR_MESSAGES.USERS_QUOTA_REACHED);
		}

		this.logger.info('Reset-password token resolved successfully', { userId: user.id });
		this.eventService.emit('user-password-reset-email-click', { user });
	}

	/**
	 * Verify password reset token and update password.
	 */
	@Post('/change-password', { skipAuth: true })
	async changePassword(
		req: AuthlessRequest,
		res: Response,
		@Body payload: ChangePasswordRequestDto,
	) {
		const { token, password, mfaCode } = payload;

		const user = await this.authService.resolvePasswordResetToken(token);
		if (!user) throw new NotFoundError('');

		if (user.mfaEnabled) {
			if (!mfaCode) throw new BadRequestError('If MFA enabled, mfaCode is required.');

			const { decryptedSecret: secret } = await this.mfaService.getSecretAndRecoveryCodes(user.id);

			const validToken = this.mfaService.totp.verifySecret({ secret, mfaCode });

			if (!validToken) throw new BadRequestError('Invalid MFA token.');
		}

		const passwordHash = await this.passwordUtility.hash(password);

		await this.userService.update(user.id, { password: passwordHash });

		this.logger.info('User password updated successfully', { userId: user.id });

		this.authService.issueCookie(res, user, user.mfaEnabled, req.browserId);

		this.eventService.emit('user-updated', { user, fieldsChanged: ['password'] });

		// if this user used to be an LDAP user
		const ldapIdentity = user?.authIdentities?.find((i) => i.providerType === 'ldap');
		if (ldapIdentity) {
			this.eventService.emit('user-signed-up', {
				user,
				userType: 'email',
				wasDisabledLdapUser: true,
			});
		}

		await this.externalHooks.run('user.password.update', [user.email, passwordHash]);
	}
}
