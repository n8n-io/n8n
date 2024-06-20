import { Response } from 'express';
import validator from 'validator';

import { AuthService } from '@/auth/auth.service';
import config from '@/config';
import { Post, GlobalScope, RestController } from '@/decorators';
import { RESPONSE_ERROR_MESSAGES } from '@/constants';
import { UserRequest } from '@/requests';
import { License } from '@/License';
import { UserService } from '@/services/user.service';
import { Logger } from '@/Logger';
import { isSamlLicensedAndEnabled } from '@/sso/saml/samlHelpers';
import { PasswordUtility } from '@/services/password.utility';
import { PostHogClient } from '@/posthog';
import type { User } from '@/databases/entities/User';
import { UserRepository } from '@db/repositories/user.repository';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { InternalHooks } from '@/InternalHooks';
import { ExternalHooks } from '@/ExternalHooks';

@RestController('/invitations')
export class InvitationController {
	constructor(
		private readonly logger: Logger,
		private readonly internalHooks: InternalHooks,
		private readonly externalHooks: ExternalHooks,
		private readonly authService: AuthService,
		private readonly userService: UserService,
		private readonly license: License,
		private readonly passwordUtility: PasswordUtility,
		private readonly userRepository: UserRepository,
		private readonly postHog: PostHogClient,
	) {}

	/**
	 * Send email invite(s) to one or multiple users and create user shell(s).
	 */

	@Post('/', { rateLimit: { limit: 10 } })
	@GlobalScope('user:create')
	async inviteUser(req: UserRequest.Invite) {
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

		if (!Array.isArray(req.body)) {
			this.logger.debug(
				'Request to send email invite(s) to user(s) failed because the payload is not an array',
				{
					payload: req.body,
				},
			);
			throw new BadRequestError('Invalid payload');
		}

		if (!req.body.length) return [];

		req.body.forEach((invite) => {
			if (typeof invite !== 'object' || !invite.email) {
				throw new BadRequestError(
					'Request to send email invite(s) to user(s) failed because the payload is not an array shaped Array<{ email: string }>',
				);
			}

			if (!validator.isEmail(invite.email)) {
				this.logger.debug('Invalid email in payload', { invalidEmail: invite.email });
				throw new BadRequestError(
					`Request to send email invite(s) to user(s) failed because of an invalid email address: ${invite.email}`,
				);
			}

			if (invite.role && !['global:member', 'global:admin'].includes(invite.role)) {
				throw new BadRequestError(
					`Cannot invite user with invalid role: ${invite.role}. Please ensure all invitees' roles are either 'global:member' or 'global:admin'.`,
				);
			}

			if (invite.role === 'global:admin' && !this.license.isAdvancedPermissionsLicensed()) {
				throw new ForbiddenError(
					'Cannot invite admin user without advanced permissions. Please upgrade to a license that includes this feature.',
				);
			}
		});

		const attributes = req.body.map(({ email, role }) => ({
			email,
			role: role ?? 'global:member',
		}));

		const { usersInvited, usersCreated } = await this.userService.inviteUsers(req.user, attributes);

		await this.externalHooks.run('user.invited', [usersCreated]);

		return usersInvited;
	}

	/**
	 * Fill out user shell with first name, last name, and password.
	 */
	@Post('/:id/accept', { skipAuth: true })
	async acceptInvitation(req: UserRequest.Update, res: Response) {
		const { id: inviteeId } = req.params;

		const { inviterId, firstName, lastName, password } = req.body;

		if (!inviterId || !inviteeId || !firstName || !lastName || !password) {
			this.logger.debug(
				'Request to fill out a user shell failed because of missing properties in payload',
				{ payload: req.body },
			);
			throw new BadRequestError('Invalid payload');
		}

		const validPassword = this.passwordUtility.validate(password);

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
		invitee.password = await this.passwordUtility.hash(validPassword);

		const updatedUser = await this.userRepository.save(invitee, { transaction: false });

		this.authService.issueCookie(res, updatedUser, req.browserId);

		void this.internalHooks.onUserSignup(updatedUser, {
			user_type: 'email',
			was_disabled_ldap_user: false,
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
