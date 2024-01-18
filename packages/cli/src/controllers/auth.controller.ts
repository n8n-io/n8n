import validator from 'validator';
import { Authorized, Get, Post, RestController } from '@/decorators';
import { issueCookie, resolveJwt } from '@/auth/jwt';
import { AUTH_COOKIE_NAME, RESPONSE_ERROR_MESSAGES } from '@/constants';
import { Request, Response } from 'express';
import type { User } from '@db/entities/User';
import { LoginRequest, UserRequest } from '@/requests';
import type { PublicUser } from '@/Interfaces';
import config from '@/config';
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
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { UnauthorizedError } from '@/errors/response-errors/unauthorized.error';
import { ApplicationError } from 'n8n-workflow';
import { UserRepository } from '@/databases/repositories/user.repository';

@RestController()
export class AuthController {
	constructor(
		private readonly logger: Logger,
		private readonly internalHooks: InternalHooks,
		private readonly mfaService: MfaService,
		private readonly userService: UserService,
		private readonly license: License,
		private readonly userRepository: UserRepository,
		private readonly postHog?: PostHogClient,
	) {}

	/**
	 * Log in a user.
	 */
	@Post('/login')
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
				preliminaryUser?.globalRole?.name === 'owner' ||
				preliminaryUser?.settings?.allowSSOManualLogin
			) {
				user = preliminaryUser;
				usedAuthenticationMethod = 'email';
			} else {
				throw new AuthError('SSO is enabled, please log in with SSO');
			}
		} else if (isLdapCurrentAuthenticationMethod()) {
			const preliminaryUser = await handleEmailLogin(email, password);
			if (preliminaryUser?.globalRole?.name === 'owner') {
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

			await issueCookie(res, user);
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

	/**
	 * Manually check the `n8n-auth` cookie.
	 */
	@Get('/login')
	async currentUser(req: Request, res: Response): Promise<PublicUser> {
		// Manually check the existing cookie.
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		const cookieContents = req.cookies?.[AUTH_COOKIE_NAME] as string | undefined;

		let user: User;
		if (cookieContents) {
			// If logged in, return user
			try {
				user = await resolveJwt(cookieContents);

				return await this.userService.toPublic(user, { posthog: this.postHog, withScopes: true });
			} catch (error) {
				res.clearCookie(AUTH_COOKIE_NAME);
			}
		}

		if (config.getEnv('userManagement.isInstanceOwnerSetUp')) {
			throw new AuthError('Not logged in');
		}

		try {
			user = await this.userRepository.findOneOrFail({ where: {}, relations: ['globalRole'] });
		} catch (error) {
			throw new InternalServerError(
				'No users found in database - did you wipe the users table? Create at least one user.',
			);
		}

		if (user.email || user.password) {
			throw new InternalServerError('Invalid database state - user has password set.');
		}

		await issueCookie(res, user);
		return await this.userService.toPublic(user, { posthog: this.postHog, withScopes: true });
	}

	/**
	 * Validate invite token to enable invitee to set up their account.
	 */
	@Get('/resolve-signup-token')
	async resolveSignupToken(req: UserRequest.ResolveSignUp) {
		const { inviterId, inviteeId } = req.query;
		const isWithinUsersLimit = this.license.isWithinUsersLimit();

		if (!isWithinUsersLimit) {
			this.logger.debug('Request to resolve signup token failed because of users quota reached', {
				inviterId,
				inviteeId,
			});
			throw new UnauthorizedError(RESPONSE_ERROR_MESSAGES.USERS_QUOTA_REACHED);
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

		const users = await this.userRepository.findManybyIds([inviterId, inviteeId]);

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

	/**
	 * Log out a user.
	 */
	@Authorized()
	@Post('/logout')
	logout(req: Request, res: Response) {
		res.clearCookie(AUTH_COOKIE_NAME);
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
