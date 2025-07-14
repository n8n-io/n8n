import { AcceptInvitationRequestDto, InviteUsersRequestDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { UserRepository, AuthenticatedRequest } from '@n8n/db';
import { Post, GlobalScope, RestController, Body, Param } from '@n8n/decorators';
import { Response } from 'express';

import { AuthService } from '@/auth/auth.service';
import config from '@/config';
import { RESPONSE_ERROR_MESSAGES } from '@/constants';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { EventService } from '@/events/event.service';
import { ExternalHooks } from '@/external-hooks';
import { License } from '@/license';
import { PostHogClient } from '@/posthog';
import { AuthlessRequest } from '@/requests';
import { PasswordUtility } from '@/services/password.utility';
import { UserService } from '@/services/user.service';
import { isSamlLicensedAndEnabled } from '@/sso.ee/saml/saml-helpers';

@RestController('/invitations')
export class InvitationController {
	constructor(
		private readonly logger: Logger,
		private readonly externalHooks: ExternalHooks,
		private readonly authService: AuthService,
		private readonly userService: UserService,
		private readonly license: License,
		private readonly passwordUtility: PasswordUtility,
		private readonly userRepository: UserRepository,
		private readonly postHog: PostHogClient,
		private readonly eventService: EventService,
	) {}

	/**
	 * Send email invite(s) to one or multiple users and create user shell(s).
	 */

	@Post('/', { rateLimit: { limit: 10 } })
	@GlobalScope('user:create')
	async inviteUser(
		req: AuthenticatedRequest,
		_res: Response,
		@Body invitations: InviteUsersRequestDto,
	) {
		if (invitations.length === 0) return [];

		const isWithinUsersLimit = this.license.isWithinUsersLimit();

		if (isSamlLicensedAndEnabled()) {
			this.logger.debug(
				'SAML is enabled, so users are managed by the Identity Provider and cannot be added through invites',
			);
			throw new BadRequestError(
				'SAML is enabled, so users are managed by the Identity Provider and cannot be added through invites',
			);
		}

		if (!isWithinUsersLimit) {
			this.logger.debug(
				'Request to send email invite(s) to user(s) failed because the user limit quota has been reached',
			);
			throw new ForbiddenError(RESPONSE_ERROR_MESSAGES.USERS_QUOTA_REACHED);
		}

		if (!config.getEnv('userManagement.isInstanceOwnerSetUp')) {
			this.logger.debug(
				'Request to send email invite(s) to user(s) failed because the owner account is not set up',
			);
			throw new BadRequestError('You must set up your own account before inviting others');
		}

		const attributes = invitations.map(({ email, role }) => {
			if (role === 'global:admin' && !this.license.isAdvancedPermissionsLicensed()) {
				throw new ForbiddenError(
					'Cannot invite admin user without advanced permissions. Please upgrade to a license that includes this feature.',
				);
			}
			return { email, role };
		});

		const { usersInvited, usersCreated } = await this.userService.inviteUsers(req.user, attributes);

		await this.externalHooks.run('user.invited', [usersCreated]);

		return usersInvited;
	}

	/**
	 * Fill out user shell with first name, last name, and password.
	 */
	@Post('/:id/accept', { skipAuth: true })
	async acceptInvitation(
		req: AuthlessRequest,
		res: Response,
		@Body payload: AcceptInvitationRequestDto,
		@Param('id') inviteeId: string,
	) {
		const { inviterId, firstName, lastName, password } = payload;

		const users = await this.userRepository.findManyByIds([inviterId, inviteeId]);

		if (users.length !== 2) {
			this.logger.debug(
				'Request to fill out a user shell failed because the inviter ID and/or invitee ID were not found in database',
				{
					inviterId,
					inviteeId,
				},
			);
			throw new BadRequestError('Invalid payload or URL');
		}

		const invitee = users.find((user) => user.id === inviteeId) as User;

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

		const updatedUser = await this.userRepository.save(invitee, { transaction: false });

		this.authService.issueCookie(res, updatedUser, false, req.browserId);

		this.eventService.emit('user-signed-up', {
			user: updatedUser,
			userType: 'email',
			wasDisabledLdapUser: false,
		});

		const publicInvitee = await this.userService.toPublic(invitee);

		await this.externalHooks.run('user.profile.update', [invitee.email, publicInvitee]);
		await this.externalHooks.run('user.password.update', [invitee.email, invitee.password]);

		return await this.userService.toPublic(updatedUser, {
			posthog: this.postHog,
			withScopes: true,
		});
	}
}
