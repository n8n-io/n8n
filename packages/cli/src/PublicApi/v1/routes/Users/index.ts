/* eslint-disable @typescript-eslint/no-unused-vars */
import express = require('express');
import { getConnection, In } from 'typeorm';

import { validate as uuidValidate } from 'uuid';
import { UserRequest } from '../../../../requests';

import { User } from '../../../../databases/entities/User';
import { Role } from '../../../../databases/entities/Role';

import {
	clean,
	connectionName,
	decodeCursor,
	getGlobalMemberRole,
	getNextCursor,
	getSelectableProperties,
	getUsersToSaveAndInvite,
	inviteUsers,
	saveUsersWithRole,
} from '../../../helpers';

import * as UserManagementMailer from '../../../../UserManagement/email/UserManagementMailer';

import {
	Db,
	ResponseHelper,
	InternalHooksManager,
	ActiveWorkflowRunner,
	ITelemetryUserDeletionData,
} from '../../../..';
import { SharedWorkflow } from '../../../../databases/entities/SharedWorkflow';
import { SharedCredentials } from '../../../../databases/entities/SharedCredentials';

export = {
	createUsers: ResponseHelper.send(async (req: UserRequest.Invite, res: express.Response) => {
		const tokenOwnerId = req.user.id;
		const emailsInBody = req.body.map((data) => data.email);

		let mailer: UserManagementMailer.UserManagementMailer | undefined;
		try {
			mailer = await UserManagementMailer.getInstance();
		} catch (error) {
			if (error instanceof Error) {
				throw new ResponseHelper.ResponseError(
					'Email sending must be set up in order to request a password reset email',
					undefined,
					500,
				);
			}
		}

		let role: Role | undefined;

		try {
			role = await getGlobalMemberRole();
		} catch (error) {
			throw new ResponseHelper.ResponseError(
				'Members role not found in database - inconsistent state',
				undefined,
				500,
			);
		}

		const { usersToSave, pendingUsers } = await getUsersToSaveAndInvite(emailsInBody);

		let savedUsers;

		try {
			savedUsers = await saveUsersWithRole(usersToSave, role!, tokenOwnerId);
		} catch (error) {
			throw new ResponseHelper.ResponseError('An error occurred during user creation');
		}

		const userstoInvite = [...savedUsers, ...pendingUsers];

		await inviteUsers(userstoInvite, mailer, tokenOwnerId);

		return clean(userstoInvite);
	}),
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
	// eslint-disable-next-line consistent-return
	getUsers: async (
		req: UserRequest.Get,
		res: express.Response,
		// eslint-disable-next-line @typescript-eslint/no-shadow
		next: express.NextFunction,
		// eslint-disable-next-line consistent-return
	): Promise<any> => {
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
