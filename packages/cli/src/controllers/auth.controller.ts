import { LoginRequestDto, ResolveSignupTokenQueryDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User, PublicUser } from '@n8n/db';
import { UserRepository, AuthenticatedRequest } from '@n8n/db';
import { Body, Get, Post, Query, RestController } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { isEmail } from 'class-validator';
import { Response } from 'express';

import { handleEmailLogin } from '@/auth';
import { AuthService } from '@/auth/auth.service';
import { RESPONSE_ERROR_MESSAGES } from '@/constants';
import { AuthError } from '@/errors/response-errors/auth.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { EventService } from '@/events/event.service';
import { License } from '@/license';
import { MfaService } from '@/mfa/mfa.service';
import { PostHogClient } from '@/posthog';
import { AuthlessRequest } from '@/requests';
import { UserService } from '@/services/user.service';
import {
	getCurrentAuthenticationMethod,
	isLdapCurrentAuthenticationMethod,
	isSamlCurrentAuthenticationMethod,
} from '@/sso.ee/sso-helpers';

@RestController()
export class AuthController {
	constructor(
		private readonly logger: Logger,
		private readonly authService: AuthService,
		private readonly mfaService: MfaService,
		private readonly userService: UserService,
		private readonly license: License,
		private readonly userRepository: UserRepository,
		private readonly eventService: EventService,
		private readonly postHog?: PostHogClient,
	) {}

	/** Log in a user */
	@Post('/login', { skipAuth: true, rateLimit: true })
	async login(
		req: AuthlessRequest,
		res: Response,
		@Body payload: LoginRequestDto,
	): Promise<PublicUser | undefined> {
		const { emailOrLdapLoginId, password, mfaCode, mfaRecoveryCode } = payload;

		let user: User | undefined;

		let usedAuthenticationMethod = getCurrentAuthenticationMethod();

		if (usedAuthenticationMethod === 'email' && !isEmail(emailOrLdapLoginId)) {
			throw new BadRequestError('Invalid email address');
		}

		if (isSamlCurrentAuthenticationMethod()) {
			// attempt to fetch user data with the credentials, but don't log in yet
			const preliminaryUser = await handleEmailLogin(emailOrLdapLoginId, password);
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
			const preliminaryUser = await handleEmailLogin(emailOrLdapLoginId, password);
			if (preliminaryUser?.role === 'global:owner') {
				user = preliminaryUser;
				usedAuthenticationMethod = 'email';
			} else {
				const { LdapService } = await import('@/ldap.ee/ldap.service.ee');
				user = await Container.get(LdapService).handleLdapLogin(emailOrLdapLoginId, password);
			}
		} else {
			user = await handleEmailLogin(emailOrLdapLoginId, password);
		}

		if (user) {
			if (user.mfaEnabled) {
				if (!mfaCode && !mfaRecoveryCode) {
					throw new AuthError('MFA Error', 998);
				}

				const isMfaCodeOrMfaRecoveryCodeValid = await this.mfaService.validateMfa(
					user.id,
					mfaCode,
					mfaRecoveryCode,
				);
				if (!isMfaCodeOrMfaRecoveryCodeValid) {
					throw new AuthError('Invalid mfa token or recovery code');
				}
			}

			// If user.mfaEnabled is enabled we checked for the MFA code, therefore it was used during this login execution
			this.authService.issueCookie(res, user, user.mfaEnabled, req.browserId);

			this.eventService.emit('user-logged-in', {
				user,
				authenticationMethod: usedAuthenticationMethod,
			});

			return await this.userService.toPublic(user, {
				posthog: this.postHog,
				withScopes: true,
				mfaAuthenticated: user.mfaEnabled,
			});
		}
		this.eventService.emit('user-login-failed', {
			authenticationMethod: usedAuthenticationMethod,
			userEmail: emailOrLdapLoginId,
			reason: 'wrong credentials',
		});
		throw new AuthError('Wrong username or password. Do you have caps lock on?');
	}

	/** Check if the user is already logged in */
	@Get('/login', {
		allowSkipMFA: true,
	})
	async currentUser(req: AuthenticatedRequest): Promise<PublicUser> {
		return await this.userService.toPublic(req.user, {
			posthog: this.postHog,
			withScopes: true,
			mfaAuthenticated: req.authInfo?.usedMfa,
		});
	}

	/** Validate invite token to enable invitee to set up their account */
	@Get('/resolve-signup-token', { skipAuth: true })
	async resolveSignupToken(
		_req: AuthlessRequest,
		_res: Response,
		@Query payload: ResolveSignupTokenQueryDto,
	) {
		const { inviterId, inviteeId } = payload;
		const isWithinUsersLimit = this.license.isWithinUsersLimit();

		if (!isWithinUsersLimit) {
			this.logger.debug('Request to resolve signup token failed because of users quota reached', {
				inviterId,
				inviteeId,
			});
			throw new ForbiddenError(RESPONSE_ERROR_MESSAGES.USERS_QUOTA_REACHED);
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

		this.eventService.emit('user-invite-email-click', { inviter, invitee });

		const { firstName, lastName } = inviter;
		return { inviter: { firstName, lastName } };
	}

	/** Log out a user */
	@Post('/logout')
	async logout(req: AuthenticatedRequest, res: Response) {
		await this.authService.invalidateToken(req);
		this.authService.clearCookie(res);
		return { loggedOut: true };
	}
}
