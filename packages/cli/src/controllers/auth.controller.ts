import validator from 'validator';
import { Get, Post, RestController } from '@/decorators';
import { AuthError, BadRequestError, InternalServerError } from '@/ResponseHelper';
import { sanitizeUser, withFeatureFlags } from '@/UserManagement/UserManagementHelper';
import { issueCookie, resolveJwt } from '@/auth/jwt';
import { AUTH_COOKIE_NAME } from '@/constants';
import { Request, Response } from 'express';
import type { ILogger } from 'n8n-workflow';
import type { User } from '@db/entities/User';
import { LoginRequest, UserRequest } from '@/requests';
import { In } from 'typeorm';
import type { Config } from '@/config';
import type {
	PublicUser,
	IDatabaseCollections,
	IInternalHooksClass,
	CurrentUser,
} from '@/Interfaces';
import { handleEmailLogin, handleLdapLogin } from '@/auth';
import type { PostHogClient } from '@/posthog';
import {
	isLdapCurrentAuthenticationMethod,
	isSamlCurrentAuthenticationMethod,
} from '@/sso/ssoHelpers';
import type { UserRepository } from '@db/repositories';

@RestController()
export class AuthController {
	private readonly config: Config;

	private readonly logger: ILogger;

	private readonly internalHooks: IInternalHooksClass;

	private readonly userRepository: UserRepository;

	private readonly postHog?: PostHogClient;

	constructor({
		config,
		logger,
		internalHooks,
		repositories,
		postHog,
	}: {
		config: Config;
		logger: ILogger;
		internalHooks: IInternalHooksClass;
		repositories: Pick<IDatabaseCollections, 'User'>;
		postHog?: PostHogClient;
	}) {
		this.config = config;
		this.logger = logger;
		this.internalHooks = internalHooks;
		this.userRepository = repositories.User;
		this.postHog = postHog;
	}

	/**
	 * Log in a user.
	 * Authless endpoint.
	 */
	@Post('/login')
	async login(req: LoginRequest, res: Response): Promise<PublicUser | undefined> {
		const { email, password } = req.body;
		if (!email) throw new Error('Email is required to log in');
		if (!password) throw new Error('Password is required to log in');

		let user: User | undefined;

		if (isSamlCurrentAuthenticationMethod()) {
			// attempt to fetch user data with the credentials, but don't log in yet
			const preliminaryUser = await handleEmailLogin(email, password);
			// if the user is an owner, continue with the login
			if (preliminaryUser?.globalRole?.name === 'owner') {
				user = preliminaryUser;
			} else {
				throw new AuthError('SAML is enabled, please log in with SAML');
			}
		} else if (isLdapCurrentAuthenticationMethod()) {
			user = await handleLdapLogin(email, password);
		} else {
			user = await handleEmailLogin(email, password);
		}
		if (user) {
			await issueCookie(res, user);
			return withFeatureFlags(this.postHog, sanitizeUser(user));
		}

		throw new AuthError('Wrong username or password. Do you have caps lock on?');
	}

	/**
	 * Manually check the `n8n-auth` cookie.
	 */
	@Get('/login')
	async currentUser(req: Request, res: Response): Promise<CurrentUser> {
		// Manually check the existing cookie.
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		const cookieContents = req.cookies?.[AUTH_COOKIE_NAME] as string | undefined;

		let user: User;
		if (cookieContents) {
			// If logged in, return user
			try {
				user = await resolveJwt(cookieContents);
				return await withFeatureFlags(this.postHog, sanitizeUser(user));
			} catch (error) {
				res.clearCookie(AUTH_COOKIE_NAME);
			}
		}

		if (this.config.getEnv('userManagement.isInstanceOwnerSetUp')) {
			throw new AuthError('Not logged in');
		}

		try {
			user = await this.userRepository.findOneOrFail({
				relations: ['globalRole'],
				where: {},
			});
		} catch (error) {
			throw new InternalServerError(
				'No users found in database - did you wipe the users table? Create at least one user.',
			);
		}

		if (user.email || user.password) {
			throw new InternalServerError('Invalid database state - user has password set.');
		}

		await issueCookie(res, user);
		return withFeatureFlags(this.postHog, sanitizeUser(user));
	}

	/**
	 * Validate invite token to enable invitee to set up their account.
	 * Authless endpoint.
	 */
	@Get('/resolve-signup-token')
	async resolveSignupToken(req: UserRequest.ResolveSignUp) {
		const { inviterId, inviteeId } = req.query;

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

		const users = await this.userRepository.find({ where: { id: In([inviterId, inviteeId]) } });
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
	 * Authless endpoint.
	 */
	@Post('/logout')
	logout(req: Request, res: Response) {
		res.clearCookie(AUTH_COOKIE_NAME);
		return { loggedOut: true };
	}
}
