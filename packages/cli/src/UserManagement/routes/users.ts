/* eslint-disable no-restricted-syntax */
/* eslint-disable import/no-cycle */
import { Response } from 'express';
import { ErrorReporterProxy as ErrorReporter, LoggerProxy as Logger } from 'n8n-workflow';
import { In } from 'typeorm';
import validator from 'validator';

import { Db, InternalHooksManager, ITelemetryUserDeletionData, ResponseHelper } from '../..';
import { SharedCredentials } from '../../databases/entities/SharedCredentials';
import { SharedWorkflow } from '../../databases/entities/SharedWorkflow';
import { User } from '../../databases/entities/User';
import { UserRequest } from '../../requests';
import * as UserManagementMailer from '../email/UserManagementMailer';
import { N8nApp, PublicUser } from '../Interfaces';
import {
	getInstanceBaseUrl,
	hashPassword,
	isEmailSetUp,
	isUserManagementDisabled,
	sanitizeUser,
	validatePassword,
} from '../UserManagementHelper';

import * as config from '../../../config';
import { issueCookie } from '../auth/jwt';

export function usersNamespace(this: N8nApp): void {
	/**
	 * Send email invite(s) to one or multiple users and create user shell(s).
	 */
	this.app.post(
		`/${this.restEndpoint}/users`,
		ResponseHelper.send(async (req: UserRequest.Invite) => {
			if (config.getEnv('userManagement.emails.mode') === '') {
				Logger.debug(
					'Request to send email invite(s) to user(s) failed because emailing was not set up',
				);
				throw new ResponseHelper.ResponseError(
					'Email sending must be set up in order to request a password reset email',
					undefined,
					500,
				);
			}

			let mailer: UserManagementMailer.UserManagementMailer | undefined;
			try {
				mailer = await UserManagementMailer.getInstance();
			} catch (error) {
				if (error instanceof Error) {
					throw new ResponseHelper.ResponseError(
						`There is a problem with your SMTP setup! ${error.message}`,
						undefined,
						500,
					);
				}
			}

			// TODO: this should be checked in the middleware rather than here
			if (isUserManagementDisabled()) {
				Logger.debug(
					'Request to send email invite(s) to user(s) failed because user management is disabled',
				);
				throw new ResponseHelper.ResponseError('User management is disabled');
			}

			if (!config.getEnv('userManagement.isInstanceOwnerSetUp')) {
				Logger.debug(
					'Request to send email invite(s) to user(s) failed because the owner account is not set up',
				);
				throw new ResponseHelper.ResponseError(
					'You must set up your own account before inviting others',
					undefined,
					400,
				);
			}

			if (!Array.isArray(req.body)) {
				Logger.debug(
					'Request to send email invite(s) to user(s) failed because the payload is not an array',
					{
						payload: req.body,
					},
				);
				throw new ResponseHelper.ResponseError('Invalid payload', undefined, 400);
			}

			if (!req.body.length) return [];

			const createUsers: { [key: string]: string | null } = {};
			// Validate payload
			req.body.forEach((invite) => {
				if (typeof invite !== 'object' || !invite.email) {
					throw new ResponseHelper.ResponseError(
						'Request to send email invite(s) to user(s) failed because the payload is not an array shaped Array<{ email: string }>',
						undefined,
						400,
					);
				}

				if (!validator.isEmail(invite.email)) {
					Logger.debug('Invalid email in payload', { invalidEmail: invite.email });
					throw new ResponseHelper.ResponseError(
						`Request to send email invite(s) to user(s) failed because of an invalid email address: ${invite.email}`,
						undefined,
						400,
					);
				}
				createUsers[invite.email.toLowerCase()] = null;
			});

			const role = await Db.collections.Role.findOne({ scope: 'global', name: 'member' });

			if (!role) {
				Logger.error(
					'Request to send email invite(s) to user(s) failed because no global member role was found in database',
				);
				throw new ResponseHelper.ResponseError(
					'Members role not found in database - inconsistent state',
					undefined,
					500,
				);
			}

			// remove/exclude existing users from creation
			const existingUsers = await Db.collections.User.find({
				where: { email: In(Object.keys(createUsers)) },
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

			Logger.debug(total > 1 ? `Creating ${total} user shells...` : `Creating 1 user shell...`);

			try {
				await Db.transaction(async (transactionManager) => {
					return Promise.all(
						usersToSetUp.map(async (email) => {
							const newUser = Object.assign(new User(), {
								email,
								globalRole: role,
							});
							const savedUser = await transactionManager.save<User>(newUser);
							createUsers[savedUser.email] = savedUser.id;
							return savedUser;
						}),
					);
				});

				void InternalHooksManager.getInstance().onUserInvite({
					user_id: req.user.id,
					target_user_id: Object.values(createUsers) as string[],
					public_api: false,
				});
			} catch (error) {
				ErrorReporter.error(error);
				Logger.error('Failed to create user shells', { userShells: createUsers });
				throw new ResponseHelper.ResponseError('An error occurred during user creation');
			}

			Logger.info('Created user shell(s) successfully', { userId: req.user.id });
			Logger.verbose(total > 1 ? `${total} user shells created` : `1 user shell created`, {
				userShells: createUsers,
			});

			const baseUrl = getInstanceBaseUrl();

			const usersPendingSetup = Object.entries(createUsers).filter(([email, id]) => id && email);

			// send invite email to new or not yet setup users

			const emailingResults = await Promise.all(
				usersPendingSetup.map(async ([email, id]) => {
					// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
					const inviteAcceptUrl = `${baseUrl}/signup?inviterId=${req.user.id}&inviteeId=${id}`;
					const result = await mailer?.invite({
						email,
						inviteAcceptUrl,
						domain: baseUrl,
					});
					const resp: { user: { id: string | null; email: string }; error?: string } = {
						user: {
							id,
							email,
						},
					};
					if (result?.success) {
						void InternalHooksManager.getInstance().onUserTransactionalEmail({
							// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
							user_id: id!,
							message_type: 'New user invite',
							public_api: false,
						});
					} else {
						void InternalHooksManager.getInstance().onEmailFailed({
							user_id: req.user.id,
							message_type: 'New user invite',
							public_api: false,
						});
						Logger.error('Failed to send email', {
							userId: req.user.id,
							inviteAcceptUrl,
							domain: baseUrl,
							email,
						});
						resp.error = `Email could not be sent`;
					}
					return resp;
				}),
			);

			await this.externalHooks.run('user.invited', [usersToSetUp]);

			Logger.debug(
				usersPendingSetup.length > 1
					? `Sent ${usersPendingSetup.length} invite emails successfully`
					: `Sent 1 invite email successfully`,
				{ userShells: createUsers },
			);

			return emailingResults;
		}),
	);

	/**
	 * Validate invite token to enable invitee to set up their account.
	 *
	 * Authless endpoint.
	 */
	this.app.get(
		`/${this.restEndpoint}/resolve-signup-token`,
		ResponseHelper.send(async (req: UserRequest.ResolveSignUp) => {
			const { inviterId, inviteeId } = req.query;

			if (!inviterId || !inviteeId) {
				Logger.debug(
					'Request to resolve signup token failed because of missing user IDs in query string',
					{ inviterId, inviteeId },
				);
				throw new ResponseHelper.ResponseError('Invalid payload', undefined, 400);
			}

			// Postgres validates UUID format
			for (const userId of [inviterId, inviteeId]) {
				if (!validator.isUUID(userId)) {
					Logger.debug('Request to resolve signup token failed because of invalid user ID', {
						userId,
					});
					throw new ResponseHelper.ResponseError('Invalid userId', undefined, 400);
				}
			}

			const users = await Db.collections.User.find({ where: { id: In([inviterId, inviteeId]) } });

			if (users.length !== 2) {
				Logger.debug(
					'Request to resolve signup token failed because the ID of the inviter and/or the ID of the invitee were not found in database',
					{ inviterId, inviteeId },
				);
				throw new ResponseHelper.ResponseError('Invalid invite URL', undefined, 400);
			}

			const invitee = users.find((user) => user.id === inviteeId);

			if (!invitee || invitee.password) {
				Logger.error('Invalid invite URL - invitee already setup', {
					inviterId,
					inviteeId,
				});
				throw new ResponseHelper.ResponseError(
					'The invitation was likely either deleted or already claimed',
					undefined,
					400,
				);
			}

			const inviter = users.find((user) => user.id === inviterId);

			if (!inviter?.email || !inviter?.firstName) {
				Logger.error(
					'Request to resolve signup token failed because inviter does not exist or is not set up',
					{
						inviterId: inviter?.id,
					},
				);
				throw new ResponseHelper.ResponseError('Invalid request', undefined, 400);
			}

			void InternalHooksManager.getInstance().onUserInviteEmailClick({
				user_id: inviteeId,
			});

			const { firstName, lastName } = inviter;

			return { inviter: { firstName, lastName } };
		}),
	);

	/**
	 * Fill out user shell with first name, last name, and password.
	 *
	 * Authless endpoint.
	 */
	this.app.post(
		`/${this.restEndpoint}/users/:id`,
		ResponseHelper.send(async (req: UserRequest.Update, res: Response) => {
			const { id: inviteeId } = req.params;

			const { inviterId, firstName, lastName, password } = req.body;

			if (!inviterId || !inviteeId || !firstName || !lastName || !password) {
				Logger.debug(
					'Request to fill out a user shell failed because of missing properties in payload',
					{ payload: req.body },
				);
				throw new ResponseHelper.ResponseError('Invalid payload', undefined, 400);
			}

			const validPassword = validatePassword(password);

			const users = await Db.collections.User.find({
				where: { id: In([inviterId, inviteeId]) },
				relations: ['globalRole'],
			});

			if (users.length !== 2) {
				Logger.debug(
					'Request to fill out a user shell failed because the inviter ID and/or invitee ID were not found in database',
					{
						inviterId,
						inviteeId,
					},
				);
				throw new ResponseHelper.ResponseError('Invalid payload or URL', undefined, 400);
			}

			const invitee = users.find((user) => user.id === inviteeId) as User;

			if (invitee.password) {
				Logger.debug(
					'Request to fill out a user shell failed because the invite had already been accepted',
					{ inviteeId },
				);
				throw new ResponseHelper.ResponseError(
					'This invite has been accepted already',
					undefined,
					400,
				);
			}

			invitee.firstName = firstName;
			invitee.lastName = lastName;
			invitee.password = await hashPassword(validPassword);

			const updatedUser = await Db.collections.User.save(invitee);

			await issueCookie(res, updatedUser);

			void InternalHooksManager.getInstance().onUserSignup({
				user_id: invitee.id,
			});

			await this.externalHooks.run('user.profile.update', [invitee.email, sanitizeUser(invitee)]);
			await this.externalHooks.run('user.password.update', [invitee.email, invitee.password]);

			return sanitizeUser(updatedUser);
		}),
	);

	this.app.get(
		`/${this.restEndpoint}/users`,
		ResponseHelper.send(async () => {
			const users = await Db.collections.User.find({ relations: ['globalRole'] });

			return users.map((user): PublicUser => sanitizeUser(user, ['personalizationAnswers']));
		}),
	);

	/**
	 * Delete a user. Optionally, designate a transferee for their workflows and credentials.
	 */
	this.app.delete(
		`/${this.restEndpoint}/users/:id`,
		// @ts-ignore
		ResponseHelper.send(async (req: UserRequest.Delete) => {
			const { id: idToDelete } = req.params;

			if (req.user.id === idToDelete) {
				Logger.debug(
					'Request to delete a user failed because it attempted to delete the requesting user',
					{ userId: req.user.id },
				);
				throw new ResponseHelper.ResponseError('Cannot delete your own user', undefined, 400);
			}

			const { transferId } = req.query;

			if (transferId === idToDelete) {
				throw new ResponseHelper.ResponseError(
					'Request to delete a user failed because the user to delete and the transferee are the same user',
					undefined,
					400,
				);
			}

			const users = await Db.collections.User.find({
				where: { id: In([transferId, idToDelete]) },
			});

			if (!users.length || (transferId && users.length !== 2)) {
				throw new ResponseHelper.ResponseError(
					'Request to delete a user failed because the ID of the user to delete and/or the ID of the transferee were not found in DB',
					undefined,
					404,
				);
			}

			const userToDelete = users.find((user) => user.id === req.params.id) as User;

			if (transferId) {
				const transferee = users.find((user) => user.id === transferId);
				await Db.transaction(async (transactionManager) => {
					await transactionManager.update(
						SharedWorkflow,
						{ user: userToDelete },
						{ user: transferee },
					);
					await transactionManager.update(
						SharedCredentials,
						{ user: userToDelete },
						{ user: transferee },
					);
					await transactionManager.delete(User, { id: userToDelete.id });
				});

				return { success: true };
			}

			const [ownedSharedWorkflows, ownedSharedCredentials] = await Promise.all([
				Db.collections.SharedWorkflow.find({
					relations: ['workflow'],
					where: { user: userToDelete },
				}),
				Db.collections.SharedCredentials.find({
					relations: ['credentials'],
					where: { user: userToDelete },
				}),
			]);

			await Db.transaction(async (transactionManager) => {
				const ownedWorkflows = await Promise.all(
					ownedSharedWorkflows.map(async ({ workflow }) => {
						if (workflow.active) {
							// deactivate before deleting
							await this.activeWorkflowRunner.remove(workflow.id.toString());
						}
						return workflow;
					}),
				);
				await transactionManager.remove(ownedWorkflows);
				await transactionManager.remove(
					ownedSharedCredentials.map(({ credentials }) => credentials),
				);
				await transactionManager.delete(User, { id: userToDelete.id });
			});

			const telemetryData: ITelemetryUserDeletionData = {
				user_id: req.user.id,
				target_user_old_status: userToDelete.isPending ? 'invited' : 'active',
				target_user_id: idToDelete,
			};

			telemetryData.migration_strategy = transferId ? 'transfer_data' : 'delete_data';

			if (transferId) {
				telemetryData.migration_user_id = transferId;
			}

			void InternalHooksManager.getInstance().onUserDeletion(req.user.id, telemetryData, false);

			await this.externalHooks.run('user.deleted', [sanitizeUser(userToDelete)]);

			return { success: true };
		}),
	);

	/**
	 * Resend email invite to user.
	 */
	this.app.post(
		`/${this.restEndpoint}/users/:id/reinvite`,
		ResponseHelper.send(async (req: UserRequest.Reinvite) => {
			const { id: idToReinvite } = req.params;

			if (!isEmailSetUp()) {
				Logger.error('Request to reinvite a user failed because email sending was not set up');
				throw new ResponseHelper.ResponseError(
					'Email sending must be set up in order to invite other users',
					undefined,
					500,
				);
			}

			const reinvitee = await Db.collections.User.findOne({ id: idToReinvite });

			if (!reinvitee) {
				Logger.debug(
					'Request to reinvite a user failed because the ID of the reinvitee was not found in database',
				);
				throw new ResponseHelper.ResponseError('Could not find user', undefined, 404);
			}

			if (reinvitee.password) {
				Logger.debug(
					'Request to reinvite a user failed because the invite had already been accepted',
					{ userId: reinvitee.id },
				);
				throw new ResponseHelper.ResponseError(
					'User has already accepted the invite',
					undefined,
					400,
				);
			}

			const baseUrl = getInstanceBaseUrl();
			const inviteAcceptUrl = `${baseUrl}/signup?inviterId=${req.user.id}&inviteeId=${reinvitee.id}`;

			let mailer: UserManagementMailer.UserManagementMailer | undefined;
			try {
				mailer = await UserManagementMailer.getInstance();
			} catch (error) {
				if (error instanceof Error) {
					throw new ResponseHelper.ResponseError(error.message, undefined, 500);
				}
			}

			const result = await mailer?.invite({
				email: reinvitee.email,
				inviteAcceptUrl,
				domain: baseUrl,
			});

			if (!result?.success) {
				void InternalHooksManager.getInstance().onEmailFailed({
					user_id: req.user.id,
					message_type: 'Resend invite',
					public_api: false,
				});
				Logger.error('Failed to send email', {
					email: reinvitee.email,
					inviteAcceptUrl,
					domain: baseUrl,
				});
				throw new ResponseHelper.ResponseError(
					`Failed to send email to ${reinvitee.email}`,
					undefined,
					500,
				);
			}

			void InternalHooksManager.getInstance().onUserReinvite({
				user_id: req.user.id,
				target_user_id: reinvitee.id,
				public_api: false,
			});

			void InternalHooksManager.getInstance().onUserTransactionalEmail({
				user_id: reinvitee.id,
				message_type: 'Resend invite',
				public_api: false,
			});

			return { success: true };
		}),
	);
}
