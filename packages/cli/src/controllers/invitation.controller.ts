import { In } from 'typeorm';
import Container, { Service } from 'typedi';
import { Authorized, NoAuthRequired, Post, RequireGlobalScope, RestController } from '@/decorators';
import { issueCookie } from '@/auth/jwt';
import { RESPONSE_ERROR_MESSAGES } from '@/constants';
import { Response } from 'express';
import { UserRequest } from '@/requests';
import { Config } from '@/config';
import { IExternalHooksClass, IInternalHooksClass } from '@/Interfaces';
import { License } from '@/License';
import { UserService } from '@/services/user.service';
import { Logger } from '@/Logger';
import { isSamlLicensedAndEnabled } from '@/sso/saml/samlHelpers';
import { hashPassword, validatePassword } from '@/UserManagement/UserManagementHelper';
import { PostHogClient } from '@/posthog';
import type { User } from '@/databases/entities/User';
import validator from 'validator';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { UnauthorizedError } from '@/errors/response-errors/unauthorized.error';

@Service()
@Authorized()
@RestController('/invitations')
export class InvitationController {
	constructor(
		private readonly config: Config,
		private readonly logger: Logger,
		private readonly internalHooks: IInternalHooksClass,
		private readonly externalHooks: IExternalHooksClass,
		private readonly userService: UserService,
		private readonly license: License,
		private readonly postHog?: PostHogClient,
	) {}

	/**
	 * Send email invite(s) to one or multiple users and create user shell(s).
	 */

	@Post('/')
	@RequireGlobalScope('user:create')
	async inviteUser(req: UserRequest.Invite) {
		const isWithinUsersLimit = Container.get(License).isWithinUsersLimit();

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
			throw new UnauthorizedError(RESPONSE_ERROR_MESSAGES.USERS_QUOTA_REACHED);
		}

		if (!this.config.getEnv('userManagement.isInstanceOwnerSetUp')) {
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

			if (invite.role && !['member', 'admin'].includes(invite.role)) {
				throw new BadRequestError(
					`Cannot invite user with invalid role: ${invite.role}. Please ensure all invitees' roles are either 'member' or 'admin'.`,
				);
			}

			if (invite.role === 'admin' && !this.license.isAdvancedPermissionsLicensed()) {
				throw new UnauthorizedError(
					'Cannot invite admin user without advanced permissions. Please upgrade to a license that includes this feature.',
				);
			}
		});

		const attributes = req.body.map(({ email, role }) => ({
			email,
			role: role ?? 'member',
		}));

		const { usersInvited, usersCreated } = await this.userService.inviteUsers(req.user, attributes);

		await this.externalHooks.run('user.invited', [usersCreated]);

		return usersInvited;
	}

	/**
	 * Fill out user shell with first name, last name, and password.
	 */
	@NoAuthRequired()
	@Post('/:id/accept')
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

		const validPassword = validatePassword(password);

		const users = await this.userService.findMany({
			where: { id: In([inviterId, inviteeId]) },
			relations: ['globalRole'],
		});

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
		invitee.password = await hashPassword(validPassword);

		const updatedUser = await this.userService.save(invitee);

		await issueCookie(res, updatedUser);

		void this.internalHooks.onUserSignup(updatedUser, {
			user_type: 'email',
			was_disabled_ldap_user: false,
		});

		const publicInvitee = await this.userService.toPublic(invitee);

		await this.externalHooks.run('user.profile.update', [invitee.email, publicInvitee]);
		await this.externalHooks.run('user.password.update', [invitee.email, invitee.password]);

		return this.userService.toPublic(updatedUser, { posthog: this.postHog, withScopes: true });
	}
}
