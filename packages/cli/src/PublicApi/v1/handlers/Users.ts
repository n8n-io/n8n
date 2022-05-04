/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unused-vars */
import express = require('express');

import { UserRequest } from '../../../requests';

import { User } from '../../../databases/entities/User';

import {
	clean,
	deleteDataAndSendTelemetry,
	getAllUsersAndCount,
	encodeNextCursor,
	getUser,
	getUsers,
	getUsersToSaveAndInvite,
	inviteUsers,
	saveUsersWithRole,
	transferWorkflowsAndCredentials,
} from '../../helpers';

import { ResponseHelper } from '../../..';

import { middlewares } from '../../middlewares';

export = {
	createUsers: [
		...middlewares.createUsers,
		ResponseHelper.send(async (req: UserRequest.Invite, res: express.Response) => {
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
		}),
	],
	deleteUser: [
		...middlewares.deleteUsers,
		async (req: UserRequest.Delete, res: express.Response) => {
			const { identifier: idToDelete } = req.params;
			const { transferId = '', includeRole = false } = req.query;
			const apiKeyUserOwner = req.user;

			const users = await getUsers({
				withIdentifiers: [idToDelete, transferId],
				includeRole,
			});

			if (apiKeyUserOwner.id === idToDelete) {
				return res.status(400).json({
					message: 'Cannot delete your own user',
				});
			}

			if (!users?.length || (transferId !== '' && users.length !== 2)) {
				return res.status(400).json({
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

				return clean(userToDelete);
			}

			await deleteDataAndSendTelemetry({
				fromUser: userToDelete,
				apiKeyOwnerUser: apiKeyUserOwner,
				transferId,
			});

			return clean(userToDelete, { includeRole });
		},
	],
	getUser: [
		...middlewares.getUser,
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
		...middlewares.getUsers,
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
