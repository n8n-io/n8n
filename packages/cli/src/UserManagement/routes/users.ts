/* eslint-disable import/no-cycle */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Response } from 'express';
import { getConnection, In } from 'typeorm';
import { genSaltSync, hashSync } from 'bcryptjs';
import validator from 'validator';
import { LoggerProxy } from 'n8n-workflow';

import { Db, ResponseHelper } from '../..';
import { N8nApp } from '../Interfaces';
import { UserRequest } from '../../requests';
import {
	getInstanceBaseUrl,
	isEmailSetUp,
	sanitizeUser,
	validatePassword,
} from '../UserManagementHelper';
import { User } from '../../databases/entities/User';
import { SharedWorkflow } from '../../databases/entities/SharedWorkflow';
import { SharedCredentials } from '../../databases/entities/SharedCredentials';
import { getInstance } from '../email/UserManagementMailer';

import config = require('../../../config');
import { issueCookie } from '../auth/jwt';

export function usersNamespace(this: N8nApp): void {
	/**
	 * Send email invite(s) to one or multiple users and create user shell(s).
	 */
	this.app.post(
		`/${this.restEndpoint}/users`,
		ResponseHelper.send(async (req: UserRequest.Invite) => {
			if (config.get('userManagement.emails.mode') === '') {
				throw new ResponseHelper.ResponseError(
					'Email sending must be set up in order to invite other users',
					undefined,
					500,
				);
			}

			if (!Array.isArray(req.body)) {
				throw new ResponseHelper.ResponseError('Invalid payload', undefined, 400);
			}

			if (!req.body.length) return [];

			const createUsers: { [key: string]: string | null } = {};
			// Validate payload
			req.body.forEach((invite) => {
				if (typeof invite !== 'object' || !invite.email) {
					throw new ResponseHelper.ResponseError('Invalid payload', undefined, 400);
				}

				if (!validator.isEmail(invite.email)) {
					throw new ResponseHelper.ResponseError(
						`Invalid email address ${invite.email}`,
						undefined,
						400,
					);
				}
				createUsers[invite.email] = null;
			});

			const role = await Db.collections.Role!.findOne({ scope: 'global', name: 'member' });

			// remove/exclude existing users from creation
			const existingUsers = await Db.collections.User!.find({
				where: { email: In(Object.keys(createUsers)) },
			});
			existingUsers.forEach((user) => {
				if (user.password) {
					delete createUsers[user.email];
					return;
				}
				createUsers[user.email] = user.id;
			});

			try {
				await getConnection().transaction(async (transactionManager) => {
					return Promise.all(
						Object.keys(createUsers)
							.filter((email) => createUsers[email] === null)
							.map(async (email) => {
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
			} catch (error) {
				// TODO: Logger
				throw new ResponseHelper.ResponseError(`An error occurred during user creation`);
			}

			const baseUrl = getInstanceBaseUrl();

			// send invite email to new or not yet setup users
			const mailer = getInstance();

			return Promise.all(
				Object.entries(createUsers)
					.filter(([email, id]) => id && email)
					.map(async ([email, id]) => {
						// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
						const inviteAcceptUrl = `${baseUrl}/signup/inviterId=${req.user.id}&inviteeId=${id}`;
						const result = await mailer.invite({
							email,
							inviteAcceptUrl,
							domain: baseUrl,
						});
						const resp: { id: string | null; email: string; error?: string } = {
							id,
							email,
						};
						if (!result.success) {
							// TODO: Logger
							resp.error = `Email could not be sent`;
						}
						return { user: resp };
					}),
			);
		}),
	);

	/**
	 * Validate invite token to enable invitee to set up their account.
	 */
	this.app.get(
		`/${this.restEndpoint}/resolve-signup-token`,
		ResponseHelper.send(async (req: UserRequest.ResolveSignUp) => {
			const { inviterId, inviteeId } = req.query;

			if (!inviterId || !inviteeId) {
				LoggerProxy.error('Invalid invite URL - did not receive user IDs', {
					inviterId,
					inviteeId,
				});
				throw new ResponseHelper.ResponseError('Invalid payload', undefined, 400);
			}

			const users = await Db.collections.User!.find({ where: { id: In([inviterId, inviteeId]) } });

			if (users.length !== 2) {
				LoggerProxy.error('Invalid invite URL - did not find users', { inviterId, inviteeId });
				throw new ResponseHelper.ResponseError('Invalid invite URL', undefined, 400);
			}

			const inviter = users.find((user) => user.id === inviterId);

			if (!inviter || !inviter.email || !inviter.firstName) {
				LoggerProxy.error('Invalid invite URL - inviter does not have email set', {
					inviterId,
					inviteeId,
				});
				throw new ResponseHelper.ResponseError('Invalid request', undefined, 400);
			}

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
				throw new ResponseHelper.ResponseError('Invalid payload', undefined, 400);
			}

			const validPassword = validatePassword(password);

			const users = await Db.collections.User!.find({
				where: { id: In([inviterId, inviteeId]) },
			});

			if (users.length !== 2) {
				throw new ResponseHelper.ResponseError('Invalid payload or URL', undefined, 400);
			}

			const invitee = users.find((user) => user.id === inviteeId) as User;

			if (invitee.password) {
				throw new ResponseHelper.ResponseError(
					'This invite has been accepted already',
					undefined,
					400,
				);
			}

			invitee.firstName = firstName;
			invitee.lastName = lastName;
			invitee.password = hashSync(validPassword, genSaltSync(10));

			const updatedUser = await Db.collections.User!.save(invitee);

			await issueCookie(res, updatedUser);

			return sanitizeUser(updatedUser);
		}),
	);

	this.app.get(
		`/${this.restEndpoint}/users`,
		ResponseHelper.send(async () => {
			const users = await Db.collections.User!.find({ relations: ['globalRole'] });

			return users.map(sanitizeUser);
		}),
	);

	/**
	 * Delete a user. Optionally, designate a transferee for their workflows and credentials.
	 */
	this.app.delete(
		`/${this.restEndpoint}/users/:id`,
		ResponseHelper.send(async (req: UserRequest.Delete) => {
			const { id: idToDelete } = req.params;

			if (req.user.id === idToDelete) {
				throw new ResponseHelper.ResponseError('Cannot delete your own user', undefined, 400);
			}

			const { transferId } = req.query;

			if (transferId === idToDelete) {
				throw new ResponseHelper.ResponseError(
					'User to delete and transferee cannot be the same',
					undefined,
					400,
				);
			}

			const users = await Db.collections.User!.find({
				where: { id: In([transferId, idToDelete]) },
			});

			if (!users.length || (transferId && users.length !== 2)) {
				throw new ResponseHelper.ResponseError('Could not find user', undefined, 404);
			}

			const userToDelete = users.find((user) => user.id === req.params.id) as User;

			if (transferId) {
				const transferee = users.find((user) => user.id === transferId);
				await getConnection().transaction(async (transactionManager) => {
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

			const [ownedWorkflows, ownedCredentials] = await Promise.all([
				Db.collections.SharedWorkflow!.find({
					relations: ['workflow'],
					where: { user: userToDelete },
				}),
				Db.collections.SharedCredentials!.find({
					relations: ['credentials'],
					where: { user: userToDelete },
				}),
			]);

			await getConnection().transaction(async (transactionManager) => {
				await transactionManager.remove(ownedWorkflows.map(({ workflow }) => workflow));
				await transactionManager.remove(ownedCredentials.map(({ credentials }) => credentials));
				await transactionManager.delete(User, { id: userToDelete.id });
			});

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

			if (!isEmailSetUp) {
				throw new ResponseHelper.ResponseError(
					'Email sending must be set up in order to invite other users',
					undefined,
					500,
				);
			}

			const reinvitee = await Db.collections.User!.findOne({ id: idToReinvite });

			if (!reinvitee) {
				throw new ResponseHelper.ResponseError('Could not find user', undefined, 404);
			}

			if (reinvitee.password) {
				throw new ResponseHelper.ResponseError(
					'User has already accepted the invite',
					undefined,
					400,
				);
			}

			const baseUrl = getInstanceBaseUrl();

			const result = await getInstance().invite({
				email: reinvitee.email,
				inviteAcceptUrl: `${baseUrl}/signup/inviterId=${req.user.id}&inviteeId=${reinvitee.id}`,
				domain: baseUrl,
			});

			if (!result.success) {
				throw new ResponseHelper.ResponseError(
					`Failed to send email to ${reinvitee.email}`,
					undefined,
					500,
				);
			}

			return { success: true };
		}),
	);
}
