/* eslint-disable import/no-cycle */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Response } from 'express';
import { getConnection, In } from 'typeorm';
import { genSaltSync, hashSync } from 'bcryptjs';
import validator from 'validator';

import { Db, ResponseHelper } from '../..';
import { N8nApp } from '../Interfaces';
import { UserRequest } from '../../requests';
import {
	getInstanceDomain,
	isEmailSetUp,
	isFailedQuery,
	sanitizeUser,
} from '../UserManagementHelper';
import { User } from '../../databases/entities/User';
import { SharedWorkflow } from '../../databases/entities/SharedWorkflow';
import { SharedCredentials } from '../../databases/entities/SharedCredentials';
import { getInstance } from '../email/UserManagementMailer';
import { issueJWT } from '../auth/jwt';

export function usersNamespace(this: N8nApp): void {
	/**
	 * Send email invite(s) to one or multiple users and create user shell(s).
	 */
	this.app.post(
		`/${this.restEndpoint}/users`,
		ResponseHelper.send(async (req: UserRequest.Invite) => {
			if (!isEmailSetUp) {
				throw new ResponseHelper.ResponseError(
					'Email sending must be set up in order to invite other users',
					undefined,
					500,
				);
			}

			if (!Array.isArray(req.body)) {
				throw new ResponseHelper.ResponseError('Invalid payload', undefined, 400);
			}

			const invites = req.body;

			invites.forEach(({ email }) => {
				if (!validator.isEmail(email)) {
					throw new ResponseHelper.ResponseError(`Invalid email address: ${email}`, undefined, 400);
				}
			});

			const role = await Db.collections.Role!.findOneOrFail({ scope: 'global', name: 'member' });

			let createdUsers: User[] = [];
			try {
				createdUsers = await getConnection().transaction(async (transactionManager) => {
					return Promise.all(
						invites.map(async ({ email }) => {
							const newUser = new User();
							Object.assign(newUser, { email, globalRole: role });
							return transactionManager.save<User>(newUser);
						}),
					);
				});
			} catch (error) {
				if (isFailedQuery(error)) {
					throw new ResponseHelper.ResponseError(
						`Email address ${error.parameters[1]} already exists`,
						undefined,
						400,
					);
				}
			}

			const domain = getInstanceDomain();
			const mailer = getInstance();

			return Promise.all(
				createdUsers.map(async ({ id, email }) => {
					const inviteAcceptUrl = `${domain}/signup/inviterId=${req.user.id}&inviteeId=${id}`;
					const result = await mailer.invite({
						email,
						inviteAcceptUrl,
						domain,
					});

					if (!result.success) {
						throw new ResponseHelper.ResponseError(`Email to ${email} could not be sent`);
					}

					return { id, email };
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
				throw new ResponseHelper.ResponseError('Invalid payload', undefined, 400);
			}

			const users = await Db.collections.User!.find({ where: { id: In([inviterId, inviteeId]) } });

			if (users.length !== 2) {
				throw new ResponseHelper.ResponseError('Invalid invite URL', undefined, 400);
			}

			const inviter = users.find((user) => user.id === inviterId);

			if (!inviter || !inviter.email || !inviter.firstName) {
				throw new ResponseHelper.ResponseError('Invalid invite URL', undefined, 400);
			}

			const { firstName, lastName } = inviter;

			return { inviter: { firstName, lastName } };
		}),
	);

	/**
	 * Fill out user shell with first name, last name, and password.
	 */
	this.app.post(
		`/${this.restEndpoint}/users/:id`,
		ResponseHelper.send(async (req: UserRequest.Update, res: Response) => {
			if (req.user) {
				throw new ResponseHelper.ResponseError(
					'Please log out before accepting another invite',
					undefined,
					500,
				);
			}

			const { id: inviteeId } = req.params;

			const { inviterId, firstName, lastName, password } = req.body;

			if (!inviterId || !inviteeId || !firstName || !lastName || !password) {
				throw new ResponseHelper.ResponseError('Invalid payload', undefined, 500);
			}

			const users = await Db.collections.User!.find({
				where: { id: In([inviterId, inviteeId]) },
			});

			if (users.length !== 2) {
				throw new ResponseHelper.ResponseError('Invalid invite URL', undefined, 500);
			}

			const invitee = users.find((user) => user.id === inviteeId);

			if (!invitee || invitee.password) {
				throw new ResponseHelper.ResponseError(
					'This invite has been accepted already',
					undefined,
					500,
				);
			}

			invitee.firstName = firstName;
			invitee.lastName = lastName;
			invitee.password = hashSync(password, genSaltSync(10));

			const updatedUser = await Db.collections.User!.save(invitee);

			const userData = await issueJWT(updatedUser);
			res.cookie('n8n-auth', userData.token, { maxAge: userData.expiresIn, httpOnly: true });

			return sanitizeUser(updatedUser);
		}),
	);

	this.app.get(
		`/${this.restEndpoint}/users`,
		ResponseHelper.send(async () => {
			const users = await Db.collections.User!.find();

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

			if (transferId && transferId === idToDelete) {
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

			const userToDelete = users.find((user) => user.id === req.params.id)!;

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

			const domain = getInstanceDomain();

			const result = await getInstance().invite({
				email: reinvitee.email,
				inviteAcceptUrl: `${domain}/signup/inviterId=${req.user.id}&inviteeId=${reinvitee.id}`,
				domain,
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
