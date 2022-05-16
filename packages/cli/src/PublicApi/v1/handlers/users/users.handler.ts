/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unused-vars */
import express = require('express');

import { UserRequest } from '../../../../requests';

import { User } from '../../../../databases/entities/User';

import {
	clean,
	deleteDataAndSendTelemetry,
	getAllUsersAndCount,
	getUser,
	getUsers,
	getUsersToSaveAndInvite,
	inviteUsers,
	saveUsersWithRole,
	transferWorkflowsAndCredentials,
} from './users.service';

import { encodeNextCursor } from '../../shared/services/pagination.service';
import { authorize, validCursor } from '../../shared/midlewares/global.midleware';
import {
	deletingOwnUser,
	getMailerInstance,
	globalMemberRoleSetup,
	transferingToDeletedUser,
	userManagmentEnabled,
	emailSetup,
} from './users.midleware';

export = {
	createUser: [
		userManagmentEnabled,
		emailSetup,
		authorize(['owner']),
		getMailerInstance,
		globalMemberRoleSetup,
		async (req: UserRequest.Invite, res: express.Response) => {
			const tokenOwnerId = req.user.id;
			const emailsInBody = req.body.map((data) => data.email);
			const { mailer, globalMemberRole: role } = req;

			const { usersToSave, pendingUsers } = await getUsersToSaveAndInvite(emailsInBody);

			let savedUsers;

			try {
				savedUsers = await saveUsersWithRole(usersToSave, role, tokenOwnerId);
			} catch (error) {
				return res.status(500).json({
					message: 'An error occurred during user creation',
				});
			}

			const userstoInvite = [...savedUsers, ...pendingUsers];

			await inviteUsers(userstoInvite, mailer, tokenOwnerId);

			return res.json(clean(userstoInvite));
		},
	],
	deleteUser: [
		userManagmentEnabled,
		deletingOwnUser,
		transferingToDeletedUser,
		authorize(['owner']),
		async (req: UserRequest.Delete, res: express.Response) => {
			const { identifier: idToDelete } = req.params;
			const { transferId = '', includeRole = false } = req.query;
			const apiKeyUserOwner = req.user;

			const users = await getUsers({
				withIdentifiers: [idToDelete, transferId],
				includeRole,
			});

			if (!users?.length || (transferId !== '' && users.length !== 2)) {
				return res.status(404).json({
					message:
						'Request to delete a user failed because the ID of the user to delete and/or the ID of the transferee were not found in DB',
				});
			}

			const userToDelete = users?.find(
				(user) => user.id === req.params.identifier || user.email === req.params.identifier,
			) as User;

			if (transferId) {
				const transferee = users?.find(
					(user) => user.id === transferId || user.email === transferId,
				) as User;

				await transferWorkflowsAndCredentials({
					fromUser: userToDelete,
					toUser: transferee,
				});

				return res.json(clean(userToDelete, { includeRole }));
			}

			await deleteDataAndSendTelemetry({
				fromUser: userToDelete,
				apiKeyOwnerUser: apiKeyUserOwner,
				transferId,
			});

			return res.json(clean(userToDelete, { includeRole }));
		},
	],
	getUser: [
		userManagmentEnabled,
		authorize(['owner']),
		async (req: UserRequest.Get, res: express.Response) => {
			const { includeRole = false } = req.query;
			const { identifier } = req.params;

			const user = await getUser({ withIdentifier: identifier, includeRole });

			if (!user) {
				return res.status(404).json({
					message: `Could not find user with identifier: ${identifier}`,
				});
			}

			return res.json(clean(user, { includeRole }));
		},
	],
	getUsers: [
		userManagmentEnabled,
		validCursor,
		authorize(['owner']),
		async (req: UserRequest.Get, res: express.Response) => {
			const { offset = 0, limit = 100, includeRole = false } = req.query;

			const [users, count] = await getAllUsersAndCount({
				includeRole,
				limit,
				offset,
			});

			return res.json({
				data: clean(users, { includeRole }),
				nextCursor: encodeNextCursor({
					offset,
					limit,
					numberOfTotalRecords: count,
				}),
			});
		},
	],
};
