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
	deleteDataAndSendTelemetry,
	getGlobalMemberRole,
	getNextCursor,
	getSelectableProperties,
	getUsers,
	getUsersToSaveAndInvite,
	inviteUsers,
	saveUsersWithRole,
	transferWorkflowsAndCredentials,
} from '../../../helpers';

import * as UserManagementMailer from '../../../../UserManagement/email/UserManagementMailer';

import { Db, ResponseHelper } from '../../../..';

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
		const { transferId } = req.query;
		const apiKeyUserOwner = req.user;
		const includeRole = req.query?.includeRole?.toLowerCase() === 'true' || false;

		const users = await getUsers({ withIdentifiers: [idToDelete, transferId ?? ''], includeRole });

		if (!users?.length || (transferId && users.length !== 2)) {
			throw new ResponseHelper.ResponseError(
				'Request to delete a user failed because the ID of the user to delete and/or the ID of the transferee were not found in DB',
				undefined,
				400,
			);
		}

		const userToDelete = users?.find((user) => user.id === req.params.identifier) as User;

		if (transferId) {
			const transferee = users?.find((user) => user.id === transferId) as User;

			await transferWorkflowsAndCredentials({
				fromUser: userToDelete,
				toUser: transferee,
			});

			return clean(userToDelete);
		}

		await deleteDataAndSendTelemetry({
			fromUser: userToDelete,
			apiKeyOwnerUser: apiKeyUserOwner,
			transferId,
		});

		return clean(userToDelete);
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
