import express = require('express');
import { getConnection, In } from 'typeorm';

import { validate as uuidValidate } from 'uuid';
import validator from 'validator';
import { UserRequest } from '../../../../requests';

import { User } from '../../../../databases/entities/User';

import {
	clean,
	connectionName,
	decodeCursor,
	getNextCursor,
	getSelectableProperties,
} from '../../../helpers';

import config = require('../../../../../config');

import * as UserManagementMailer from '../../../../UserManagement/email/UserManagementMailer';

import {
	Db,
	ResponseHelper,
	InternalHooksManager,
	ActiveWorkflowRunner,
	ITelemetryUserDeletionData,
} from '../../../..';
import { Role } from '../../../../databases/entities/Role';
import { getInstanceBaseUrl } from '../../../../UserManagement/UserManagementHelper';
import { SharedWorkflow } from '../../../../databases/entities/SharedWorkflow';
import { SharedCredentials } from '../../../../databases/entities/SharedCredentials';

export = {
	// eslint-disable-next-line consistent-return
	createUsers: async (req: UserRequest.Invite, res: express.Response): Promise<any> => {
		if (config.get('userManagement.emails.mode') === '') {
			return res.status(500).json({
				message: 'Email sending must be set up in order to request a password reset email',
			});
		}

		let mailer: UserManagementMailer.UserManagementMailer | undefined;
		try {
			mailer = await UserManagementMailer.getInstance();
		} catch (error) {
			if (error instanceof Error) {
				return res.status(500).json({
					message: `There is a problem with your SMTP setup! ${error.message}`,
				});
			}
		}

		const createUsers: { [key: string]: string | null } = {};
		// Validate payload
		// eslint-disable-next-line consistent-return
		req.body.forEach((invite) => {
			if (typeof invite !== 'object' || !invite.email) {
				return res.status(400).json({
					message:
						'Request to send email invite(s) to user(s) failed because the payload is not an array shaped Array<{ email: string }>',
				});
			}

			if (!validator.isEmail(invite.email)) {
				return res.status(400).json({
					message: `Request to send email invite(s) to user(s) failed because of an invalid email address: ${invite.email}`,
				});
			}
			createUsers[invite.email] = null;
		});

		const role = (await Db.collections.Role?.findOne({ scope: 'global', name: 'member' })) as Role;

		if (!role) {
			return res.status(500).json({
				message: `Members role not found in database - inconsistent state`,
			});
		}

		// remove/exclude existing users from creation
		const existingUsers = await Db.collections.User?.find({
			where: { email: In(Object.keys(createUsers)) },
		});

		existingUsers?.forEach((user) => {
			if (user.password) {
				delete createUsers[user.email];
				return;
			}
			createUsers[user.email] = user.id;
		});

		const usersToSetUp = Object.keys(createUsers).filter((email) => createUsers[email] === null);

		let savedUsers = [];
		try {
			savedUsers = await Db.transaction(async (transactionManager) => {
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
			});
		} catch (error) {
			throw new ResponseHelper.ResponseError('An error occurred during user creation');
		}

		const baseUrl = getInstanceBaseUrl();

		const usersPendingSetup = Object.entries(createUsers).filter(([email, id]) => id && email);

		// send invite email to new or not yet setup users

		await Promise.all(
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
						user_id: id!,
						message_type: 'New user invite',
					});
				} else {
					void InternalHooksManager.getInstance().onEmailFailed({
						user_id: req.user.id,
						message_type: 'New user invite',
					});
					resp.error = `Email could not be sent`;
				}
				return resp;
			}),
		);

		res.json([...clean(existingUsers ?? []), ...clean(savedUsers)]);
	},
	// eslint-disable-next-line consistent-return
	deleteUser: async (req: UserRequest.Delete, res: express.Response): Promise<any> => {
		const { identifier: idToDelete } = req.params;

		const includeRole = req.query?.includeRole?.toLowerCase() === 'true' || false;

		if (req.user.id === idToDelete) {
			return res.status(400).json({
				message: `Cannot delete your own user`,
			});
		}

		const { transferId } = req.query;

		if (transferId === idToDelete) {
			return res.status(400).json({
				message: `Request to delete a user failed because the user to delete and the transferee are the same user`,
			});
		}

		const users = await Db.collections.User?.find({
			where: { id: In([transferId, idToDelete]) },
			relations: includeRole ? ['globalRole'] : undefined,
		});

		if (!users?.length || (transferId && users.length !== 2)) {
			return res.status(400).json({
				message: `Request to delete a user failed because the ID of the user to delete and/or the ID of the transferee were not found in DB`,
			});
		}

		const userToDelete = users?.find((user) => user.id === req.params.identifier) as User;

		if (transferId) {
			const transferee = users?.find((user) => user.id === transferId);
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

			res.json(clean([userToDelete], true)[0]);
		}

		const [ownedSharedWorkflows = [], ownedSharedCredentials = []] = await Promise.all([
			Db.collections.SharedWorkflow?.find({
				relations: ['workflow'],
				where: { user: userToDelete },
			}),
			Db.collections.SharedCredentials?.find({
				relations: ['credentials'],
				where: { user: userToDelete },
			}),
		]);

		await Db.transaction(async (transactionManager) => {
			const ownedWorkflows = await Promise.all(
				ownedSharedWorkflows.map(async ({ workflow }) => {
					if (workflow.active) {
						const activeWorkflowRunner = ActiveWorkflowRunner.getInstance();
						// deactivate before deleting
						void activeWorkflowRunner.remove(workflow.id.toString());
					}
					return workflow;
				}),
			);
			await transactionManager.remove(ownedWorkflows);
			await transactionManager.remove(ownedSharedCredentials.map(({ credentials }) => credentials));
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

		void InternalHooksManager.getInstance().onUserDeletion(req.user.id, telemetryData);

		res.json(clean([userToDelete], true)[0]);
	},
	// eslint-disable-next-line consistent-return
	getUser: async (req: UserRequest.Get, res: express.Response): Promise<any> => {
		const includeRole = req.query?.includeRole?.toLowerCase() === 'true' || false;
		const { identifier } = req.params;

		const query = getConnection(connectionName())
			.getRepository(User)
			.createQueryBuilder()
			.leftJoinAndSelect('User.globalRole', 'Role')
			.select(getSelectableProperties('user')?.map((property) => `User.${property}`));

		if (includeRole) {
			query.addSelect(getSelectableProperties('role')?.map((property) => `Role.${property}`));
		}

		if (uuidValidate(identifier)) {
			query.where({ id: identifier });
		} else {
			query.where({ email: identifier });
		}

		const user = await query.getOne();

		if (user === undefined) {
			return res.status(404);
		}

		res.json(user);
	},
	getUsers: async (req: UserRequest.Get, res: express.Response): Promise<any> => {
		let offset = 0;
		let limit = parseInt(req.query.limit, 10) || 10;
		const includeRole = req.query?.includeRole?.toLowerCase() === 'true' || false;

		if (req.query.cursor) {
			const { cursor } = req.query;
			try {
				({ offset, limit } = decodeCursor(cursor));
			} catch (error) {
				return res.status(400).json({
					message: 'Invalid cursor',
				});
			}
		}

		const query = getConnection(connectionName())
			.getRepository(User)
			.createQueryBuilder()
			.leftJoinAndSelect('User.globalRole', 'Role')
			.select(getSelectableProperties('user')?.map((property) => `User.${property}`))
			.limit(limit)
			.offset(offset);

		if (includeRole) {
			query.addSelect(getSelectableProperties('role')?.map((property) => `Role.${property}`));
		}

		const [users, count] = await query.getManyAndCount();

		res.json({
			users,
			nextCursor: getNextCursor(offset, limit, count),
		});
	},
};
