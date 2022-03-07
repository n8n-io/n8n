import express = require('express');

import { ActiveWorkflowRunner, Db, ResponseHelper } from '../../../..';

import { IDataObject, LoggerProxy as Logger } from 'n8n-workflow';

import config = require('../../../../../config');

import { Equal, getConnection, In, Not } from 'typeorm';

import { getInstance as getMailerInstance } from '../../../../UserManagement/email/UserManagementMailer';

import { User } from '../../../../databases/entities/User';

import { getInstanceBaseUrl } from '../../../../UserManagement/UserManagementHelper';

import { validate as uuidValidate } from 'uuid';

import { addFinshedSetupProperty, decodeCursor, getNextCursor, getUserBaseSelectableProperties } from '../../Helpers';

import { UserRequest } from '../../../../requests';
import { SharedWorkflow } from '../../../../databases/entities/SharedWorkflow';
import { SharedCredentials } from '../../../../databases/entities/SharedCredentials';

export = {
	createUsers: async (req: UserRequest.Invite, res: express.Response) => {

		//validate wheather smtp server was defined and the instance has an owner

		if (req.user.globalRole.name !== 'owner') {
			res.json({
				message: 'Only owner has access to this endpoint',
			}).status(401);
		}

		const memberRole = await Db.collections.Role!.findOne({ scope: 'global', name: 'member' });

		const usersToSetUp = req.body as [{ email: string }];

		let savedUsers: User[];

		try {
			savedUsers = await getConnection().transaction(async (transactionManager) => {
				return Promise.all(
					usersToSetUp.map(async ({ email }) => {
						const newUser = Object.assign(new User(), {
							email,
							globalRole: memberRole,
						});
						const savedUser = await transactionManager.save<User>(newUser);
						return savedUser;
					}),
				);
			});
		} catch (error) {
			Logger.error('Failed to create user shells', { userShells: usersToSetUp });
			throw new ResponseHelper.ResponseError('An error occurred during user creation');
		}

		const baseUrl = getInstanceBaseUrl();

		const mailer = getMailerInstance();

		const emailingResults = await Promise.all(
			savedUsers.map(async ({ email, id }) => {
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
				//@ts-ignore
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
					Logger.error('Failed to send email', {
						//@ts-ignore
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

		res.json(savedUsers);
	},
	deleteUser: async (req: UserRequest.Delete, res: express.Response) => {

		if (req.user.globalRole.name !== 'owner') {
			res.json({
				message: 'Only owner has access to this endpoint',
			}).status(401);
		}

		const { id: idToDelete, email: emailToDelete } = req.params;

		if (req.user.id === idToDelete || emailToDelete === req.user.email) {
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
			where: [
				{ id: In([transferId, idToDelete]) },
				{ email: Equal(emailToDelete) },
			],
		});

		if (!users.length || (transferId && users.length !== 2)) {
			throw new ResponseHelper.ResponseError(
				'Request to delete a user failed because the ID of the user to delete and/or the ID of the transferee were not found in DB',
				undefined,
				404,
			);
		}

		const userToDelete = users.find((user) => user.id === req.params.id || user.email === req.params.email) as User;

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
						const activeWorkflowRunner = ActiveWorkflowRunner.getInstance();
						// deactivate before deleting
						await activeWorkflowRunner.remove(workflow.id.toString());
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

		return { success: true };
	},
	getUser: async (req: UserRequest.Get, res: express.Response) => {

		if (req.user.globalRole.name !== 'owner') {
			res.json({
				message: 'Only owner has access to this endpoint',
			}).status(401);
		}

		const user = await Db.collections.User!.findOne({
			where: [
				{ id: req.user.id },
				{ email: req.user.email },
			],
		});

		if (user === undefined) {
			return res.status(404).send();
		}

		return res.json(user);
	},
	getUsers: async (req: UserRequest.Get, res: express.Response) => {
		let offset = 0;
		let limit = parseInt(req.query.limit as string, 10) || 10;

		if (req.query.cursor) {
			const cursor = req.query.cursor as string;
			({ offset, limit } = decodeCursor(cursor));
		}

		const query = getConnection()
			.getRepository(User)
			.createQueryBuilder()
			.leftJoinAndSelect('User.globalRole', 'Role')
			.select(getUserBaseSelectableProperties()
				.map(property => `User.${property}`))
			.addSelect('Role.id')
			.limit(limit)
			.offset(offset);

		// tslint:disable-next-line: prefer-const
		let [users, count] = await query.getManyAndCount();

		//TODO: Do this at the db level
		users = addFinshedSetupProperty(users);

		res.json({
			users,
			nextCursor: getNextCursor(offset, limit, count),
		});
	},
}; 
