import { Response } from 'express';
import validator from 'validator';

import { AuthService } from '@/auth/auth.service';
import { RESPONSE_ERROR_MESSAGES } from '@/constants';
import { UserRepository } from '@/databases/repositories/user.repository';
import { Get, Post, RestController } from '@/decorators';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { UnprocessableRequestError } from '@/errors/response-errors/unprocessable.error';
import { EventService } from '@/events/event.service';
import { ExternalHooks } from '@/external-hooks';
import { License } from '@/license';
import { Logger } from '@/logging/logger.service';
import { MfaService } from '@/mfa/mfa.service';
import { PasswordResetRequest } from '@/requests';
import { PasswordUtility } from '@/services/password.utility';
import { UserService } from '@/services/user.service';
import { isSamlCurrentAuthenticationMethod } from '@/sso/sso-helpers';
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
	async forgotPassword(req: PasswordResetRequest.Email) {
		if (!this.mailer.isEmailSetUp) {
			this.logger.debug(
				'Request to send password reset email failed because emailing was not set up',
			);
			throw new InternalServerError(
				'Email sending must be set up in order to request a password reset email',
			);
		}

		const { email } = req.body;
		if (!email) {
			this.logger.debug(
				'Request to send password reset email failed because of missing email in payload',
				{ payload: req.body },
			);
			throw new BadRequestError('Email is mandatory');
		}

		if (!validator.isEmail(email)) {
			this.logger.debug(
				'Request to send password reset email failed because of invalid email in payload',
				{ invalidEmail: email },
			);
			throw new BadRequestError('Invalid email address');
		}

		// User should just be able to reset password if one is already present
		const user = await this.userRepository.findNonShellUser(email);

		if (!user?.isOwner && !this.license.isWithinUsersLimit()) {
			this.logger.debug(
				'Request to send password reset email failed because the user limit was reached',
			);
			throw new ForbiddenError(RESPONSE_ERROR_MESSAGES.USERS_QUOTA_REACHED);
		}
		if (
			isSamlCurrentAuthenticationMethod() &&
			!(
				user?.hasGlobalScope('user:resetPassword') === true ||
				user?.settings?.allowSSOManualLogin === true
			)
		) {
			this.logger.debug(
				'Request to send password reset email failed because login is handled by SAML',
			);
			throw new ForbiddenError(
				'Login is handled by SAML. Please contact your Identity Provider to reset your password.',
			);
		}

		const ldapIdentity = user?.authIdentities?.find((i) => i.providerType === 'ldap');
		if (!user?.password || (ldapIdentity && user.disabled)) {
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
	async resolvePasswordToken(req: PasswordResetRequest.Credentials) {
		const { token } = req.query;

		if (!token) {
			this.logger.debug(
				'Request to resolve password token failed because of missing password reset token',
				{
					queryString: req.query,
				},
			);
			throw new BadRequestError('');
		}

		const user = await this.authService.resolvePasswordResetToken(token);
		if (!user) throw new NotFoundError('');

		if (!user?.isOwner && !this.license.isWithinUsersLimit()) {
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
	async changePassword(req: PasswordResetRequest.NewPassword, res: Response) {
		const { token, password, mfaCode } = req.body;

		if (!token || !password) {
			this.logger.debug(
				'Request to change password failed because of missing user ID or password or reset password token in payload',
				{
					payload: req.body,
				},
			);
			throw new BadRequestError('Missing user ID or password or reset password token');
		}

		const validPassword = this.passwordUtility.validate(password);

		const user = await this.authService.resolvePasswordResetToken(token);
		if (!user) throw new NotFoundError('');

		if (user.mfaEnabled) {
			if (!mfaCode) throw new BadRequestError('If MFA enabled, mfaCode is required.');

			const { decryptedSecret: secret } = await this.mfaService.getSecretAndRecoveryCodes(user.id);

			const validToken = this.mfaService.totp.verifySecret({ secret, mfaCode });

			if (!validToken) throw new BadRequestError('Invalid MFA token.');
		}

		const passwordHash = await this.passwordUtility.hash(validPassword);

		await this.userService.update(user.id, { password: passwordHash });

		this.logger.info('User password updated successfully', { userId: user.id });

		this.authService.issueCookie(res, user, req.browserId);

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
