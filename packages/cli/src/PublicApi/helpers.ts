import * as querystring from 'querystring';
// eslint-disable-next-line import/no-extraneous-dependencies
import { pick } from 'lodash';
import express = require('express');
import * as SwaggerParser from '@apidevtools/swagger-parser';
import { In } from 'typeorm';
// eslint-disable-next-line import/no-cycle
import { User } from '../databases/entities/User';
import type { Role } from '../databases/entities/Role';
// eslint-disable-next-line import/no-cycle
import { Db, InternalHooksManager } from '..';
// eslint-disable-next-line import/no-cycle
import { getInstanceBaseUrl } from '../UserManagement/UserManagementHelper';
// eslint-disable-next-line import/no-cycle
import * as UserManagementMailer from '../UserManagement/email';

interface IPaginationOffsetDecoded {
	offset: number;
	limit: number;
}
export interface IMiddlewares {
	[key: string]: [IMiddleware];
}
interface IMiddleware {
	(req: express.Request, res: express.Response, next: express.NextFunction): void;
}

export type OperationID = 'getUsers' | 'getUser';

export const decodeCursor = (cursor: string): IPaginationOffsetDecoded => {
	const data = JSON.parse(Buffer.from(cursor, 'base64').toString()) as string;
	const unserializedData = querystring.decode(data) as { offset: string; limit: string };
	return {
		offset: parseInt(unserializedData.offset, 10),
		limit: parseInt(unserializedData.limit, 10),
	};
};

export const getNextCursor = (
	offset: number,
	limit: number,
	numberOfRecords: number,
): string | null => {
	const retrieveRecordsLength = offset + limit;

	if (retrieveRecordsLength < numberOfRecords) {
		return Buffer.from(
			JSON.stringify(
				querystring.encode({
					limit,
					offset: offset + limit,
				}),
			),
		).toString('base64');
	}

	return null;
};

export const getSelectableProperties = (table: 'user' | 'role'): string[] => {
	return {
		user: ['id', 'email', 'firstName', 'lastName', 'createdAt', 'updatedAt', 'isPending'],
		role: ['id', 'name', 'scope', 'createdAt', 'updatedAt'],
	}[table];
};

export const connectionName = (): string => {
	return 'default';
};

export const clean = (users: User[], keepRole = false): Array<Partial<User>> => {
	return users.map((user) =>
		pick(user, getSelectableProperties('user').concat(keepRole ? ['globalRole'] : [])),
	);
};

const middlewareDefined = (operationId: OperationID, middlewares: IMiddlewares) =>
	operationId && middlewares[operationId];

export const addMiddlewares = (
	router: express.Router,
	method: string,
	routePath: string,
	operationId: OperationID,
	middlewares: IMiddlewares,
): void => {
	if (middlewareDefined(operationId, middlewares)) {
		routePath.replace(/\{([^}]+)}/g, ':$1');
		switch (method) {
			case 'get':
				router.get(routePath, ...middlewares[operationId]);
				break;
			case 'post':
				router.post(routePath, ...middlewares[operationId]);
				break;
			case 'put':
				router.post(routePath, ...middlewares[operationId]);
				break;
			case 'delete':
				router.post(routePath, ...middlewares[operationId]);
				break;
			default:
				break;
		}
	}
};

export const addCustomMiddlewares = async (
	apiController: express.Router,
	openApiSpec: string,
	middlewares: IMiddlewares,
): Promise<void> => {
	const { paths = {} } = await SwaggerParser.parse(openApiSpec);
	Object.entries(paths).forEach(([routePath, methods]) => {
		Object.entries(methods).forEach(([method, data]) => {
			const operationId: OperationID = (
				data as {
					'x-eov-operation-id': OperationID;
				}
			)['x-eov-operation-id'];
			addMiddlewares(apiController, method, routePath, operationId, middlewares);
		});
	});
};

export async function getGlobalMemberRole(): Promise<Role | undefined> {
	return Db.collections.Role?.findOneOrFail({
		name: 'member',
		scope: 'global',
	});
}

async function getUsersWithEmails(emails: string[]): Promise<User[] | undefined> {
	return Db.collections.User?.find({
		where: { email: In(emails) },
	});
}

export async function getUsersToSaveAndInvite(
	emails: string[],
): Promise<{ usersToSave: string[]; pendingUsers: User[] }> {
	const users = await getUsersWithEmails(emails);
	const usersInBody = emails;
	const usersInDB = users?.map((user) => user.email);
	const usersToSave = usersInBody.filter((email) => !usersInDB?.includes(email));
	const userInDBWithoutPassword = users?.filter((user) => !user.password);
	const pendingUsers = userInDBWithoutPassword ?? [];
	return {
		usersToSave,
		pendingUsers,
	};
}

export async function saveUsersWithRole(
	users: string[],
	role: Role,
	tokenOwnerId: string,
): Promise<User[]> {
	const savedUsers = await Db.transaction(async (transactionManager) => {
		return Promise.all(
			users.map(async (email) => {
				const newUser = Object.assign(new User(), {
					email,
					globalRole: role.id,
				});
				const savedUser = await transactionManager.save<User>(newUser);
				return savedUser;
			}),
		);
	});

	void InternalHooksManager.getInstance().onUserInvite({
		user_id: tokenOwnerId,
		target_user_id: savedUsers.map((user) => user.id),
	});

	return savedUsers;
}

async function invite(
	users: Partial<User[]>,
	mailer: UserManagementMailer.UserManagementMailer | undefined,
	apiKeyOwnerId: string,
): Promise<Array<{ success?: boolean; id?: string }>> {
	const baseUrl = getInstanceBaseUrl();
	return Promise.all(
		users.map(async (user) => {
			const resp: { success?: boolean; id?: string } = {};
			// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
			const inviteAcceptUrl = `${baseUrl}/signup?inviterId=${apiKeyOwnerId}&inviteeId=${user?.id}`;
			const sentEmail = await mailer?.invite({
				email: user!.email,
				inviteAcceptUrl,
				domain: baseUrl,
			});

			if (sentEmail?.success) {
				resp.success = true;
				resp.id = user?.id;
			} else {
				resp.success = false;
				resp.id = user?.id;
			}
			return resp;
		}),
	);
}

export async function inviteUsers(
	users: Partial<User[]>,
	mailer: UserManagementMailer.UserManagementMailer | undefined,
	apiKeyOwnerId: string,
): Promise<void> {
	const invitations = await invite(users, mailer, apiKeyOwnerId);
	invitations.forEach((invitation) => {
		if (!invitation.success) {
			void InternalHooksManager.getInstance().onEmailFailed({
				user_id: invitation.id as string,
				message_type: 'New user invite',
			});
		} else {
			void InternalHooksManager.getInstance().onUserTransactionalEmail({
				user_id: invitation.id as string,
				message_type: 'New user invite',
			});
		}
	});
}
