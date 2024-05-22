import validator from 'validator';

import { AuthService } from '@/auth/auth.service';
import { Get, Post, RestController } from '@/decorators';
import { RESPONSE_ERROR_MESSAGES } from '@/constants';
import { Request, Response } from 'express';
import type { User } from '@db/entities/User';
import { AuthenticatedRequest, LoginRequest, UserRequest } from '@/requests';
import type { PublicUser } from '@/Interfaces';
import { handleEmailLogin, handleLdapLogin } from '@/auth';
import { PostHogClient } from '@/posthog';
import {
	getCurrentAuthenticationMethod,
	isLdapCurrentAuthenticationMethod,
	isSamlCurrentAuthenticationMethod,
} from '@/sso/ssoHelpers';
import { InternalHooks } from '../InternalHooks';
import { License } from '@/License';
import { UserService } from '@/services/user.service';
import { MfaService } from '@/Mfa/mfa.service';
import { Logger } from '@/Logger';
import { AuthError } from '@/errors/response-errors/auth.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { ApplicationError } from 'n8n-workflow';
import { UserRepository } from '@/databases/repositories/user.repository';

@RestController()
export class AuthController {
	constructor(
		private readonly logger: Logger,
		private readonly internalHooks: InternalHooks,
		private readonly authService: AuthService,
		private readonly mfaService: MfaService,
		private readonly userService: UserService,
		private readonly license: License,
		private readonly userRepository: UserRepository,
		private readonly postHog?: PostHogClient,
	) {}

	/** Log in a user */
	@Post('/login', { skipAuth: true, rateLimit: true })
	async login(req: LoginRequest, res: Response): Promise<PublicUser | undefined> {
		const { email, password, mfaToken, mfaRecoveryCode } = req.body;
		if (!email) throw new ApplicationError('Email is required to log in');
		if (!password) throw new ApplicationError('Password is required to log in');

		let user: User | undefined;

		let usedAuthenticationMethod = getCurrentAuthenticationMethod();
		if (isSamlCurrentAuthenticationMethod()) {
			// attempt to fetch user data with the credentials, but don't log in yet
			const preliminaryUser = await handleEmailLogin(email, password);
			// if the user is an owner, continue with the login
			if (
				preliminaryUser?.role === 'global:owner' ||
				preliminaryUser?.settings?.allowSSOManualLogin
			) {
				user = preliminaryUser;
				usedAuthenticationMethod = 'email';
			} else {
				throw new AuthError('SSO is enabled, please log in with SSO');
			}
		} else if (isLdapCurrentAuthenticationMethod()) {
			const preliminaryUser = await handleEmailLogin(email, password);
			if (preliminaryUser?.role === 'global:owner') {
				user = preliminaryUser;
				usedAuthenticationMethod = 'email';
			} else {
				user = await handleLdapLogin(email, password);
			}
		} else {
			user = await handleEmailLogin(email, password);
		}

		if (user) {
			if (user.mfaEnabled) {
				if (!mfaToken && !mfaRecoveryCode) {
					throw new AuthError('MFA Error', 998);
				}

				const { decryptedRecoveryCodes, decryptedSecret } =
					await this.mfaService.getSecretAndRecoveryCodes(user.id);

				user.mfaSecret = decryptedSecret;
				user.mfaRecoveryCodes = decryptedRecoveryCodes;

				const isMFATokenValid =
					(await this.validateMfaToken(user, mfaToken)) ||
					(await this.validateMfaRecoveryCode(user, mfaRecoveryCode));

				if (!isMFATokenValid) {
					throw new AuthError('Invalid mfa token or recovery code');
				}
			}

			this.authService.issueCookie(res, user, req.browserId);
			void this.internalHooks.onUserLoginSuccess({
				user,
				authenticationMethod: usedAuthenticationMethod,
			});

			return await this.userService.toPublic(user, { posthog: this.postHog, withScopes: true });
		}
		void this.internalHooks.onUserLoginFailed({
			user: email,
			authenticationMethod: usedAuthenticationMethod,
			reason: 'wrong credentials',
		});
		throw new AuthError('Wrong username or password. Do you have caps lock on?');
	}

	/** Check if the user is already logged in */
	@Get('/login')
	async currentUser(req: AuthenticatedRequest): Promise<PublicUser> {
		return await this.userService.toPublic(req.user, {
			posthog: this.postHog,
			withScopes: true,
		});
	}

	/** Validate invite token to enable invitee to set up their account */
	@Get('/resolve-signup-token', { skipAuth: true })
	async resolveSignupToken(req: UserRequest.ResolveSignUp) {
		const { inviterId, inviteeId } = req.query;
		const isWithinUsersLimit = this.license.isWithinUsersLimit();

		if (!isWithinUsersLimit) {
			this.logger.debug('Request to resolve signup token failed because of users quota reached', {
				inviterId,
				inviteeId,
			});
			throw new ForbiddenError(RESPONSE_ERROR_MESSAGES.USERS_QUOTA_REACHED);
		}

		if (!inviterId || !inviteeId) {
			this.logger.debug(
				'Request to resolve signup token failed because of missing user IDs in query string',
				{ inviterId, inviteeId },
			);
			throw new BadRequestError('Invalid payload');
		}

		// Postgres validates UUID format
		for (const userId of [inviterId, inviteeId]) {
			if (!validator.isUUID(userId)) {
				this.logger.debug('Request to resolve signup token failed because of invalid user ID', {
					userId,
				});
				throw new BadRequestError('Invalid userId');
			}
		}

		const users = await this.userRepository.findManyByIds([inviterId, inviteeId]);

		if (users.length !== 2) {
			this.logger.debug(
				'Request to resolve signup token failed because the ID of the inviter and/or the ID of the invitee were not found in database',
				{ inviterId, inviteeId },
			);
			throw new BadRequestError('Invalid invite URL');
		}

		const invitee = users.find((user) => user.id === inviteeId);
		if (!invitee || invitee.password) {
			this.logger.error('Invalid invite URL - invitee already setup', {
				inviterId,
				inviteeId,
			});
			throw new BadRequestError('The invitation was likely either deleted or already claimed');
		}

		const inviter = users.find((user) => user.id === inviterId);
		if (!inviter?.email || !inviter?.firstName) {
			this.logger.error(
				'Request to resolve signup token failed because inviter does not exist or is not set up',
				{
					inviterId: inviter?.id,
				},
			);
			throw new BadRequestError('Invalid request');
		}

		void this.internalHooks.onUserInviteEmailClick({ inviter, invitee });

		const { firstName, lastName } = inviter;
		return { inviter: { firstName, lastName } };
	}

	/** Log out a user */
	@Post('/logout')
	logout(_: Request, res: Response) {
		this.authService.clearCookie(res);
		return { loggedOut: true };
	}

	private async validateMfaToken(user: User, token?: string) {
		if (!!!token) return false;
		return this.mfaService.totp.verifySecret({
			secret: user.mfaSecret ?? '',
			token,
		});
	}

	private async validateMfaRecoveryCode(user: User, mfaRecoveryCode?: string) {
		if (!!!mfaRecoveryCode) return false;
		const index = user.mfaRecoveryCodes.indexOf(mfaRecoveryCode);
		if (index === -1) return false;

		// remove used recovery code
		user.mfaRecoveryCodes.splice(index, 1);

		await this.userService.update(user.id, {
			mfaRecoveryCodes: this.mfaService.encryptRecoveryCodes(user.mfaRecoveryCodes),
		});

		return true;
	}
}
