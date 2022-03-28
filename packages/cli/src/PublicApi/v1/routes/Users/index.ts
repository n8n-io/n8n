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

import { Db, ResponseHelper, InternalHooksManager } from '../../../..';
import { Role } from '../../../../databases/entities/Role';
import { getInstanceBaseUrl } from '../../../../UserManagement/UserManagementHelper';

export = {
	createUsers: async (req: UserRequest.Invite, res: express.Response): Promise<void> => {
		if (config.get('userManagement.emails.mode') === '') {
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
				throw new ResponseHelper.ResponseError(
					`Request to send email invite(s) to user(s) failed because of an invalid email address: ${invite.email}`,
					undefined,
					400,
				);
			}
			createUsers[invite.email] = null;
		});

		const role = (await Db.collections.Role?.findOne({ scope: 'global', name: 'member' })) as Role;

		if (!role) {
			throw new ResponseHelper.ResponseError(
				'Members role not found in database - inconsistent state',
				undefined,
				500,
			);
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
	deleteUser: async (req: UserRequest.Delete, res: express.Response): Promise<void> => {
		res.json({ success: true });
	},
	getUser: async (req: UserRequest.Get, res: express.Response): Promise<void> => {
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
			res.status(404);
		}

		res.json(user);
	},
	getUsers: async (req: UserRequest.Get, res: express.Response): Promise<void> => {
		let offset = 0;
		let limit = parseInt(req.query.limit, 10) || 10;
		const includeRole = req.query?.includeRole?.toLowerCase() === 'true' || false;

		if (req.query.cursor) {
			const { cursor } = req.query;
			({ offset, limit } = decodeCursor(cursor));
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
