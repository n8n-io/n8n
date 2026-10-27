import { AcceptInvitationRequestDto, InviteUsersRequestDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import { Time } from '@n8n/constants';
import { UserRepository, AuthenticatedRequest, PersonRepository } from '@n8n/db';
import { Post, GlobalScope, RestController, Body } from '@n8n/decorators';
import { Response } from 'express';

import { AuthService } from '@/auth/auth.service';
import { BadRequestError } from '@n8n/errors';
import { ExternalHooks } from '@/external-hooks';
import { PostHogClient } from '@/posthog';
import { AuthlessRequest } from '@/requests';
import { PasswordUtility } from '@/services/password.utility';
import { UserService } from '@/services/user.service';
import { isSsoCurrentAuthenticationMethod } from '@/sso.ee/sso-helpers';

@RestController('/invitations')
export class InvitationController {
	constructor(
		private readonly logger: Logger,
		private readonly externalHooks: ExternalHooks,
		private readonly authService: AuthService,
		private readonly userService: UserService,
		private readonly passwordUtility: PasswordUtility,
		private readonly userRepository: UserRepository,
		private readonly personRepository: PersonRepository,
		private readonly postHog: PostHogClient,
		private readonly eventService: EventService,
	) {}

	/**
	 * Send email invite(s) to one or multiple users and create user shell(s).
	 */

	@Post('/', { ipRateLimit: { limit: 10 } })
	@GlobalScope('user:create')
	async inviteUser(
		req: AuthenticatedRequest,
		_res: Response,
		@Body invitations: InviteUsersRequestDto,
	) {
		return await this.userService.inviteUser(req.user, invitations);
	}

	/**
	 * Process invitation acceptance: validate users, update invitee, and handle authentication.
	 */
	private async processInvitationAcceptance(
		inviterId: string,
		inviteeId: string,
		firstName: string,
		lastName: string,
		password: string,
		req: AuthlessRequest,
		res: Response,
	): Promise<Awaited<ReturnType<UserService['toPublic']>>> {
		if (inviterId === inviteeId) {
			this.logger.debug(
				'Request to fill out a user shell failed because the inviter and the invitee are the same',
				{ inviterId, inviteeId },
			);
			throw new BadRequestError('Invalid payload or URL');
		}

		// Only a person can be invited. The inviter can be any account.
		const [inviter, invitee] = await Promise.all([
			this.userRepository.findByIdWithRole(inviterId),
			this.personRepository.findByIdWithRole(inviteeId),
		]);

		if (!inviter || !invitee) {
			this.logger.debug(
				'Request to fill out a user shell failed because the inviter ID and/or invitee ID were not found in database',
				{
					inviterId,
					inviteeId,
				},
			);
			throw new BadRequestError('Invalid payload or URL');
		}

		if (invitee.password) {
			this.logger.debug(
				'Request to fill out a user shell failed because the invite had already been accepted',
				{ inviteeId },
			);
			throw new BadRequestError('This invite has been accepted already');
		}

		invitee.firstName = firstName;
		invitee.lastName = lastName;
		invitee.password = await this.passwordUtility.hash(password);

		const updatedPerson = await this.personRepository.save(invitee);

		this.authService.issueCookie(res, updatedPerson, false, req.browserId);

		this.eventService.emit('user-signed-up', {
			user: updatedPerson,
			userType: 'email',
			wasDisabledLdapUser: false,
		});

		const publicInvitee = await this.userService.toPublic(invitee);

		await this.externalHooks.run('user.profile.update', [invitee.email, publicInvitee]);
		await this.externalHooks.run('user.password.update', [invitee.email, invitee.password]);

		return await this.userService.toPublic(updatedPerson, {
			posthog: this.postHog,
			withScopes: true,
		});
	}

	/**
	 * Fill out user shell with first name, last name, and password using JWT token.
	 */
	@Post('/accept', {
		skipAuth: true,
		// Two layered rate limit to ensure multiple users can accept an invitation from
		// the same IP address but aggressive per inviteeId limit.
		ipRateLimit: { limit: 100, windowMs: 1 * Time.minutes.toMilliseconds },
	})
	async acceptInvitationWithToken(
		req: AuthlessRequest,
		res: Response,
		@Body payload: AcceptInvitationRequestDto,
	) {
		if (isSsoCurrentAuthenticationMethod()) {
			this.logger.debug(
				'Invite links are not supported on this system, please use single sign on instead.',
			);
			throw new BadRequestError(
				'Invite links are not supported on this system, please use single sign on instead.',
			);
		}

		if (!payload.token) {
			this.logger.debug('Request to accept invitation failed because token is missing');
			throw new BadRequestError('Token is required');
		}

		const { firstName, lastName, password } = payload;

		// Extract inviterId and inviteeId from JWT token
		const { inviterId, inviteeId } = await this.userService.getInvitationIdsFromPayload(
			payload.token,
		);

		return await this.processInvitationAcceptance(
			inviterId,
			inviteeId,
			firstName,
			lastName,
			password,
			req,
			res,
		);
	}
}
