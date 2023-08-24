import { IsNull, Not } from '@n8n/typeorm';
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

import { Response } from 'express';
import { ILogger } from 'n8n-workflow';
import { Config } from '@/config';
import { PasswordResetRequest } from '@/requests';
import { IExternalHooksClass, IInternalHooksClass } from '@/Interfaces';
import { issueCookie } from '@/auth/jwt';
import { isLdapEnabled } from '@/Ldap/helpers';
import { isSamlCurrentAuthenticationMethod } from '@/sso/ssoHelpers';
import { UserService } from '@/services/user.service';
import { License } from '@/License';
import { Container } from 'typedi';
import { RESPONSE_ERROR_MESSAGES } from '@/constants';
import { TokenExpiredError } from 'jsonwebtoken';
import type { JwtPayload } from '@/services/jwt.service';
import { JwtService } from '@/services/jwt.service';
import { MfaService } from '@/Mfa/mfa.service';

@RestController()
export class PasswordResetController {
	constructor(
		private readonly config: Config,
		private readonly logger: ILogger,
		private readonly externalHooks: IExternalHooksClass,
		private readonly internalHooks: IInternalHooksClass,
		private readonly mailer: UserManagementMailer,
		private readonly userService: UserService,
		private readonly jwtService: JwtService,
		private readonly mfaService: MfaService,
	) {}

	/**
	 * Send a password reset email.
	 */
	@Post('/forgot-password')
	async forgotPassword(req: PasswordResetRequest.Email) {
		if (this.config.getEnv('userManagement.emails.mode') === '') {
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

		if (!user?.isOwner && !Container.get(License).isWithinUsersLimit()) {
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

		const baseUrl = getInstanceBaseUrl();
		const { id, firstName, lastName } = user;

		const resetPasswordToken = this.jwtService.signData(
			{ sub: id },
			{
				expiresIn: '1d',
			},
		);

		const url = this.userService.generatePasswordResetUrl(
			baseUrl,
			resetPasswordToken,
			user.mfaEnabled,
		);

		try {
			await this.mailer.passwordReset({
				email,
				firstName,
				lastName,
				passwordResetUrl: url,
				domain: baseUrl,
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
		const { token: resetPasswordToken } = req.query;

		if (!resetPasswordToken) {
			this.logger.debug(
				'Request to resolve password token failed because of missing password reset token',
				{
					queryString: req.query,
				},
			);
			throw new BadRequestError('');
		}

		const decodedToken = this.verifyResetPasswordToken(resetPasswordToken);

		const user = await this.userService.findOne({
			where: { id: decodedToken.sub },
			relations: ['globalRole'],
		});

		if (!user?.isOwner && !Container.get(License).isWithinUsersLimit()) {
			this.logger.debug(
				'Request to resolve password token failed because the user limit was reached',
				{ userId: decodedToken.sub },
			);
			throw new UnauthorizedError(RESPONSE_ERROR_MESSAGES.USERS_QUOTA_REACHED);
		}

		if (!user) {
			this.logger.debug(
				'Request to resolve password token failed because no user was found for the provided user ID',
				{
					userId: decodedToken.sub,
					resetPasswordToken,
				},
			);
			throw new NotFoundError('');
		}

		this.logger.info('Reset-password token resolved successfully', { userId: user.id });
		void this.internalHooks.onUserPasswordResetEmailClick({ user });
	}

	/**
	 * Verify password reset token and update password.
	 */
	@Post('/change-password')
	async changePassword(req: PasswordResetRequest.NewPassword, res: Response) {
		const { token: resetPasswordToken, password, mfaToken } = req.body;

		if (!resetPasswordToken || !password) {
			this.logger.debug(
				'Request to change password failed because of missing user ID or password or reset password token in payload',
				{
					payload: req.body,
				},
			);
			throw new BadRequestError('Missing user ID or password or reset password token');
		}

		const validPassword = validatePassword(password);

		const decodedToken = this.verifyResetPasswordToken(resetPasswordToken);

		const user = await this.userService.findOne({
			where: { id: decodedToken.sub },
			relations: ['authIdentities'],
		});

		if (!user) {
			this.logger.debug(
				'Request to resolve password token failed because no user was found for the provided user ID',
				{
					resetPasswordToken,
				},
			);
			throw new NotFoundError('');
		}

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

	private verifyResetPasswordToken(resetPasswordToken: string) {
		let decodedToken: JwtPayload;
		try {
			decodedToken = this.jwtService.verifyToken(resetPasswordToken);
			return decodedToken;
		} catch (e) {
			if (e instanceof TokenExpiredError) {
				this.logger.debug('Reset password token expired', {
					resetPasswordToken,
				});
				throw new NotFoundError('');
			}
			this.logger.debug('Error verifying token', {
				resetPasswordToken,
			});
			throw new BadRequestError('');
		}
	}
}
