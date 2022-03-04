/* eslint-disable no-restricted-syntax */
/* eslint-disable import/no-cycle */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import express = require('express');
import { Request, Response } from 'express';
import { getConnection, In } from 'typeorm';
import { genSaltSync, hashSync } from 'bcryptjs';
import validator from 'validator';
import { LoggerProxy as Logger } from 'n8n-workflow';

import { PublicUser } from '../Interfaces';
import { AuthenticatedRequest, UserRequest } from '../../requests';
import { getInstance as getActiveWorkflowRunnerInstance } from '../../ActiveWorkflowRunner';
import {
	getInstanceBaseUrl,
	isAuthenticatedRequest,
	sanitizeUser,
	validatePassword,
} from '../UserManagementHelper';
import { User } from '../../databases/entities/User';
import { SharedWorkflow } from '../../databases/entities/SharedWorkflow';
import { SharedCredentials } from '../../databases/entities/SharedCredentials';
import { getInstance } from '../email/UserManagementMailer';

import config = require('../../../config');
import { issueCookie } from '../auth/jwt';
import * as Db from '../../Db';
import * as ResponseHelper from '../../ResponseHelper';

export const usersController = express.Router();

usersController.use(
	(req: Request | AuthenticatedRequest, res: Response, next: express.NextFunction) => {
		if (isAuthenticatedRequest(req) && req.user.globalRole.name === 'owner') {
			next();
			return;
		}

		// Signup url is publicly accessible
		const singleUriParamRegex = new RegExp('^/[^/]+/?$');
		if (req.method === 'POST' && singleUriParamRegex.test(req.url)) {
			next();
			return;
		}

		// Deny everything else
		res.status(403).json({ status: 'error', message: 'Unauthorized' });
	},
);

/**
 * Send email invite(s) to one or multiple users and create user shell(s).
 */
usersController.post(
	'/',
	ResponseHelper.send(async (req: UserRequest.Invite) => {
		if (config.get('userManagement.emails.mode') === '') {
			Logger.debug(
				'Request to send email invite(s) to user(s) failed because emailing was not set up',
			);
			throw new ResponseHelper.ResponseError(
				'Email sending must be set up in order to request a password reset email',
				undefined,
				500,
			);
		}

		if (!config.get('userManagement.isInstanceOwnerSetUp')) {
			Logger.debug(
				'Request to send email invite(s) to user(s) failed because emailing was not set up',
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
			createUsers[invite.email] = null;
		});

		const role = await Db.collections.Role!.findOne({ scope: 'global', name: 'member' });

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

		const usersToSetUp = Object.keys(createUsers).filter((email) => createUsers[email] === null);
		const total = usersToSetUp.length;

		Logger.debug(total > 1 ? `Creating ${total} user shells...` : `Creating 1 user shell...`);

		try {
			await getConnection().transaction(async (transactionManager) => {
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
		} catch (error) {
			Logger.error('Failed to create user shells', { userShells: createUsers });
			throw new ResponseHelper.ResponseError('An error occurred during user creation');
		}

		Logger.info('Created user shells successfully', { userId: req.user.id });
		Logger.verbose(total > 1 ? `${total} user shells created` : `1 user shell created`, {
			userShells: createUsers,
		});

		const baseUrl = getInstanceBaseUrl();

		const usersPendingSetup = Object.entries(createUsers).filter(([email, id]) => id && email);

		// send invite email to new or not yet setup users
		const mailer = getInstance();

		const emailingResults = await Promise.all(
			usersPendingSetup.map(async ([email, id]) => {
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
				const inviteAcceptUrl = `${baseUrl}/signup?inviterId=${req.user.id}&inviteeId=${id}`;
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
					Logger.error('Failed to send email', {
						userId: req.user.id,
						inviteAcceptUrl,
						domain: baseUrl,
						email,
					});
					resp.error = `Email could not be sent`;
				}
				return { user: resp };
			}),
		);

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
 * Fill out user shell with first name, last name, and password.
 *
 * Authless endpoint.
 */
usersController.post(
	'/:id',
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

		const users = await Db.collections.User!.find({
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
		invitee.password = hashSync(validPassword, genSaltSync(10));

		const updatedUser = await Db.collections.User!.save(invitee);

		await issueCookie(res, updatedUser);

		return sanitizeUser(updatedUser);
	}),
);

usersController.get(
	`/`,
	ResponseHelper.send(async () => {
		const users = await Db.collections.User!.find({ relations: ['globalRole'] });

		return users.map((user): PublicUser => sanitizeUser(user, ['personalizationAnswers']));
	}),
);

/**
 * Delete a user. Optionally, designate a transferee for their workflows and credentials.
 */
usersController.delete(
	`/:id`,
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

		const users = await Db.collections.User!.find({
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

		const [ownedSharedWorkflows, ownedSharedCredentials] = await Promise.all([
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
			const ownedWorkflows = await Promise.all(
				ownedSharedWorkflows.map(async ({ workflow }) => {
					if (workflow.active) {
						// deactivate before deleting
						await getActiveWorkflowRunnerInstance().remove(workflow.id.toString());
					}
					return workflow;
				}),
			);
			await transactionManager.remove(ownedWorkflows);
			await transactionManager.remove(ownedSharedCredentials.map(({ credentials }) => credentials));
			await transactionManager.delete(User, { id: userToDelete.id });
		});

		return { success: true };
	}),
);

/**
 * Resend email invite to user.
 */
usersController.post(
	'/:id/reinvite',
	ResponseHelper.send(async (req: UserRequest.Reinvite) => {
		const { id: idToReinvite } = req.params;

		const isEmailSetUp = config.get('userManagement.emails.mode') as '' | 'smtp';

		if (!isEmailSetUp) {
			Logger.error('Request to reinvite a user failed because email sending was not set up');
			throw new ResponseHelper.ResponseError(
				'Email sending must be set up in order to invite other users',
				undefined,
				500,
			);
		}

		const reinvitee = await Db.collections.User!.findOne({ id: idToReinvite });

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

		const result = await getInstance().invite({
			email: reinvitee.email,
			inviteAcceptUrl,
			domain: baseUrl,
		});

		if (!result.success) {
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

		return { success: true };
	}),
);
