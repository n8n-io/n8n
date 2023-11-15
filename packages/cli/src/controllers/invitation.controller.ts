import validator from 'validator';
import { In } from 'typeorm';
import Container, { Service } from 'typedi';
import { ErrorReporterProxy as ErrorReporter } from 'n8n-workflow';
import { Authorized, NoAuthRequired, Post, RestController } from '@/decorators';
import { BadRequestError, InternalServerError, UnauthorizedError } from '@/ResponseHelper';
import { issueCookie } from '@/auth/jwt';
import { RESPONSE_ERROR_MESSAGES } from '@/constants';
import { Response } from 'express';
import { User } from '@db/entities/User';
import { UserRequest } from '@/requests';
import { Config } from '@/config';

import { IExternalHooksClass, IInternalHooksClass } from '@/Interfaces';
import { License } from '@/License';
import { UserService } from '@/services/user.service';
import { Logger } from '@/Logger';
import { isSamlLicensedAndEnabled } from '@/sso/saml/samlHelpers';
import {
	generateUserInviteUrl,
	getInstanceBaseUrl,
	hashPassword,
	validatePassword,
} from '@/UserManagement/UserManagementHelper';
import { RoleService } from '@/services/role.service';
import { UserManagementMailer } from '@/UserManagement/email';
import { PostHogClient } from '@/posthog';

@Service()
@RestController('/invitations')
export class InvitationController {
	constructor(
		private readonly config: Config,
		private readonly logger: Logger,
		private readonly internalHooks: IInternalHooksClass,
		private readonly externalHooks: IExternalHooksClass,
		private readonly userService: UserService,
		private readonly roleService: RoleService,
		private readonly mailer: UserManagementMailer,
		private readonly postHog?: PostHogClient,
	) {}

	/**
	 * Send email invite(s) to one or multiple users and create user shell(s).
	 */

	@Authorized(['global', 'owner'])
	@Post('/')
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

		const createUsers: { [key: string]: string | null } = {};
		// Validate payload
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
			createUsers[invite.email.toLowerCase()] = null;
		});

		const role = await this.roleService.findGlobalMemberRole();

		if (!role) {
			this.logger.error(
				'Request to send email invite(s) to user(s) failed because no global member role was found in database',
			);
			throw new InternalServerError('Members role not found in database - inconsistent state');
		}

		// remove/exclude existing users from creation
		const existingUsers = await this.userService.findMany({
			where: { email: In(Object.keys(createUsers)) },
			relations: ['globalRole'],
		});
		existingUsers.forEach((user) => {
			if (user.password) {
				delete createUsers[user.email];
				return;
			}
			createUsers[user.email] = user.id;
		});

		const usersToSetUp = Object.keys(createUsers).filter((email) => createUsers[email] === null);
		const total = usersToSetUp.length;

		this.logger.debug(total > 1 ? `Creating ${total} user shells...` : 'Creating 1 user shell...');

		try {
			await this.userService.getManager().transaction(async (transactionManager) =>
				Promise.all(
					usersToSetUp.map(async (email) => {
						const newUser = Object.assign(new User(), {
							email,
							globalRole: role,
						});
						const savedUser = await transactionManager.save<User>(newUser);
						createUsers[savedUser.email] = savedUser.id;
						return savedUser;
					}),
				),
			);
		} catch (error) {
			ErrorReporter.error(error);
			this.logger.error('Failed to create user shells', { userShells: createUsers });
			throw new InternalServerError('An error occurred during user creation');
		}

		this.logger.debug('Created user shell(s) successfully', { userId: req.user.id });
		this.logger.verbose(total > 1 ? `${total} user shells created` : '1 user shell created', {
			userShells: createUsers,
		});

		const baseUrl = getInstanceBaseUrl();

		const usersPendingSetup = Object.entries(createUsers).filter(([email, id]) => id && email);

		// send invite email to new or not yet setup users

		const emailingResults = await Promise.all(
			usersPendingSetup.map(async ([email, id]) => {
				if (!id) {
					// This should never happen since those are removed from the list before reaching this point
					throw new InternalServerError('User ID is missing for user with email address');
				}
				const inviteAcceptUrl = generateUserInviteUrl(req.user.id, id);
				const resp: {
					user: { id: string | null; email: string; inviteAcceptUrl?: string; emailSent: boolean };
					error?: string;
				} = {
					user: {
						id,
						email,
						inviteAcceptUrl,
						emailSent: false,
					},
				};
				try {
					const result = await this.mailer.invite({
						email,
						inviteAcceptUrl,
						domain: baseUrl,
					});
					if (result.emailSent) {
						resp.user.emailSent = true;
						delete resp.user.inviteAcceptUrl;
						void this.internalHooks.onUserTransactionalEmail({
							user_id: id,
							message_type: 'New user invite',
							public_api: false,
						});
					}

					void this.internalHooks.onUserInvite({
						user: req.user,
						target_user_id: Object.values(createUsers) as string[],
						public_api: false,
						email_sent: result.emailSent,
					});
				} catch (error) {
					if (error instanceof Error) {
						void this.internalHooks.onEmailFailed({
							user: req.user,
							message_type: 'New user invite',
							public_api: false,
						});
						this.logger.error('Failed to send email', {
							userId: req.user.id,
							inviteAcceptUrl,
							domain: baseUrl,
							email,
						});
						resp.error = error.message;
					}
				}
				return resp;
			}),
		);

		await this.externalHooks.run('user.invited', [usersToSetUp]);

		this.logger.debug(
			usersPendingSetup.length > 1
				? `Sent ${usersPendingSetup.length} invite emails successfully`
				: 'Sent 1 invite email successfully',
			{ userShells: createUsers },
		);

		return emailingResults;
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

		return this.userService.toPublic(updatedUser, { posthog: this.postHog });
	}
}
