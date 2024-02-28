import { Response } from 'express';
import validator from 'validator';

import { AuthService } from '@/auth/auth.service';
import config from '@/config';
import { Post, GlobalScope, RestController, Get } from '@/decorators';
import { RESPONSE_ERROR_MESSAGES } from '@/constants';
import { InvitationRequest } from '@/requests';
import { License } from '@/License';
import { UserService } from '@/services/user.service';
import { Logger } from '@/Logger';
import { isSamlLicensedAndEnabled } from '@/sso/saml/samlHelpers';
import { PasswordUtility } from '@/services/password.utility';
import { PostHogClient } from '@/posthog';
import { UserRepository } from '@db/repositories/user.repository';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { UnauthorizedError } from '@/errors/response-errors/unauthorized.error';
import { InternalHooks } from '@/InternalHooks';
import { ExternalHooks } from '@/ExternalHooks';
import { InvitationService } from '@/services/invitation.service';

@RestController('/invitations')
export class InvitationController {
	constructor(
		private readonly logger: Logger,
		private readonly internalHooks: InternalHooks,
		private readonly externalHooks: ExternalHooks,
		private readonly authService: AuthService,
		private readonly userService: UserService,
		private readonly invitationService: InvitationService,
		private readonly license: License,
		private readonly passwordUtility: PasswordUtility,
		private readonly userRepository: UserRepository,
		private readonly postHog: PostHogClient,
	) {}

	/**
	 * Send email invite(s) to one or multiple users and create user shell(s).
	 */
	@Post('/')
	@GlobalScope('user:create')
	async inviteUser(req: InvitationRequest.Create) {
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
			throw new UnauthorizedError(RESPONSE_ERROR_MESSAGES.USERS_QUOTA_REACHED);
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
				throw new UnauthorizedError(
					'Cannot invite admin user without advanced permissions. Please upgrade to a license that includes this feature.',
				);
			}
		});

		const attributes = req.body.map(({ email, role }) => ({
			email,
			role: role ?? 'global:member',
		}));

		const { usersInvited, usersCreated } = await this.invitationService.inviteUsers(
			req.user,
			attributes,
		);

		await this.externalHooks.run('user.invited', [usersCreated]);

		return usersInvited;
	}

	/** Validate invite token to enable invitee to set up their account */
	@Get('/:token', { skipAuth: true })
	async resolveSignupToken(req: InvitationRequest.ResolveInvitation) {
		const isWithinUsersLimit = this.license.isWithinUsersLimit();
		if (!isWithinUsersLimit) {
			this.logger.debug('Request to resolve signup token failed because of users quota reached');
			throw new UnauthorizedError(RESPONSE_ERROR_MESSAGES.USERS_QUOTA_REACHED);
		}

		const { token } = req.params;
		const { invitee, inviter } = await this.invitationService.validateInvitationToken(token);
		if (!invitee || !inviter || invitee.password) {
			this.logger.debug('The invitation was likely either deleted or already claimed');
			throw new BadRequestError('Invalid token');
		}

		void this.internalHooks.onUserInviteEmailClick({ inviter, invitee });

		const { firstName, lastName } = inviter;
		return { inviter: { firstName, lastName } };
	}

	/**
	 * Fill out user shell with first name, last name, and password.
	 */
	@Post('/:token/accept', { skipAuth: true })
	async acceptInvitation(req: InvitationRequest.AcceptInvitation, res: Response) {
		const { firstName, lastName, password } = req.body;
		if (!firstName || !lastName || !password) {
			this.logger.debug(
				'Request to fill out a user shell failed because of missing properties in payload',
				{ payload: req.body },
			);
			throw new BadRequestError('Invalid payload');
		}

		const { token } = req.params;
		const { invitee, inviter } = await this.invitationService.validateInvitationToken(token);
		if (!invitee || !inviter || invitee.password) {
			this.logger.debug('The invitation was likely either deleted or already claimed');
			throw new BadRequestError('Invalid token');
		}

		invitee.firstName = firstName;
		invitee.lastName = lastName;

		const validPassword = this.passwordUtility.validate(password);
		invitee.password = await this.passwordUtility.hash(validPassword);

		const updatedUser = await this.userRepository.save(invitee, { transaction: false });

		this.authService.issueCookie(res, updatedUser);

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
