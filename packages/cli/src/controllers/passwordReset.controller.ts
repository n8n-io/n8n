import { Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { Service } from 'typedi';
import { IsNull, Not } from 'typeorm';
import validator from 'validator';

import { Get, Post, RestController } from '@/decorators';
import {
	BadRequestError,
	InternalServerError,
	NotFoundError,
	UnauthorizedError,
	UnprocessableRequestError,
} from '@/ResponseHelper';
import {
	getInstanceBaseUrl,
	hashPassword,
	validatePassword,
} from '@/UserManagement/UserManagementHelper';
import { UserManagementMailer } from '@/UserManagement/email';
import { PasswordResetRequest } from '@/requests';
import { issueCookie } from '@/auth/jwt';
import { isLdapEnabled } from '@/Ldap/helpers';
import { isSamlCurrentAuthenticationMethod } from '@/sso/ssoHelpers';
import { UserService } from '@/services/user.service';
import { License } from '@/License';
import { RESPONSE_ERROR_MESSAGES, inTest } from '@/constants';
import { MfaService } from '@/Mfa/mfa.service';
import { Logger } from '@/Logger';
import { ExternalHooks } from '@/ExternalHooks';
import { InternalHooks } from '@/InternalHooks';

const throttle = rateLimit({
	windowMs: 5 * 60 * 1000, // 5 minutes
	limit: 5, // Limit each IP to 5 requests per `window` (here, per 5 minutes).
	message: { message: 'Too many requests' },
});

@Service()
@RestController()
export class PasswordResetController {
	constructor(
		private readonly logger: Logger,
		private readonly externalHooks: ExternalHooks,
		private readonly internalHooks: InternalHooks,
		private readonly mailer: UserManagementMailer,
		private readonly userService: UserService,
		private readonly mfaService: MfaService,
		private readonly license: License,
	) {}

	/**
	 * Send a password reset email.
	 */
	@Post('/forgot-password', {
		middlewares: !inTest ? [throttle] : [],
	})
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
		const user = await this.userService.findOne({
			where: {
				email,
				password: Not(IsNull()),
			},
			relations: ['authIdentities', 'globalRole'],
		});

		if (!user?.isOwner && !this.license.isWithinUsersLimit()) {
			this.logger.debug(
				'Request to send password reset email failed because the user limit was reached',
			);
			throw new UnauthorizedError(RESPONSE_ERROR_MESSAGES.USERS_QUOTA_REACHED);
		}
		if (
			isSamlCurrentAuthenticationMethod() &&
			!(user?.globalRole.name === 'owner' || user?.settings?.allowSSOManualLogin === true)
		) {
			this.logger.debug(
				'Request to send password reset email failed because login is handled by SAML',
			);
			throw new UnauthorizedError(
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

		if (isLdapEnabled() && ldapIdentity) {
			throw new UnprocessableRequestError('forgotPassword.ldapUserPasswordResetUnavailable');
		}

		const url = this.userService.generatePasswordResetUrl(user);

		const { id, firstName, lastName } = user;
		try {
			await this.mailer.passwordReset({
				email,
				firstName,
				lastName,
				passwordResetUrl: url,
				domain: getInstanceBaseUrl(),
			});
		} catch (error) {
			void this.internalHooks.onEmailFailed({
				user,
				message_type: 'Reset password',
				public_api: false,
			});
			if (error instanceof Error) {
				throw new InternalServerError(`Please contact your administrator: ${error.message}`);
			}
		}

		this.logger.info('Sent password reset email successfully', { userId: user.id, email });
		void this.internalHooks.onUserTransactionalEmail({
			user_id: id,
			message_type: 'Reset password',
			public_api: false,
		});

		void this.internalHooks.onUserPasswordResetRequestClick({ user });
	}

	/**
	 * Verify password reset token and user ID.
	 */
	@Get('/resolve-password-token')
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

		const user = await this.userService.resolvePasswordResetToken(token);
		if (!user) throw new NotFoundError('');

		if (!user?.isOwner && !this.license.isWithinUsersLimit()) {
			this.logger.debug(
				'Request to resolve password token failed because the user limit was reached',
				{ userId: user.id },
			);
			throw new UnauthorizedError(RESPONSE_ERROR_MESSAGES.USERS_QUOTA_REACHED);
		}

		this.logger.info('Reset-password token resolved successfully', { userId: user.id });
		void this.internalHooks.onUserPasswordResetEmailClick({ user });
	}

	/**
	 * Verify password reset token and update password.
	 */
	@Post('/change-password')
	async changePassword(req: PasswordResetRequest.NewPassword, res: Response) {
		const { token, password, mfaToken } = req.body;

		if (!token || !password) {
			this.logger.debug(
				'Request to change password failed because of missing user ID or password or reset password token in payload',
				{
					payload: req.body,
				},
			);
			throw new BadRequestError('Missing user ID or password or reset password token');
		}

		const validPassword = validatePassword(password);

		const user = await this.userService.resolvePasswordResetToken(token);
		if (!user) throw new NotFoundError('');

		if (user.mfaEnabled) {
			if (!mfaToken) throw new BadRequestError('If MFA enabled, mfaToken is required.');

			const { decryptedSecret: secret } = await this.mfaService.getSecretAndRecoveryCodes(user.id);

			const validToken = this.mfaService.totp.verifySecret({ secret, token: mfaToken });

			if (!validToken) throw new BadRequestError('Invalid MFA token.');
		}

		const passwordHash = await hashPassword(validPassword);

		await this.userService.update(user.id, { password: passwordHash });

		this.logger.info('User password updated successfully', { userId: user.id });

		await issueCookie(res, user);

		void this.internalHooks.onUserUpdate({
			user,
			fields_changed: ['password'],
		});

		// if this user used to be an LDAP users
		const ldapIdentity = user?.authIdentities?.find((i) => i.providerType === 'ldap');
		if (ldapIdentity) {
			void this.internalHooks.onUserSignup(user, {
				user_type: 'email',
				was_disabled_ldap_user: true,
			});
		}

		await this.externalHooks.run('user.password.update', [user.email, passwordHash]);
	}
}
