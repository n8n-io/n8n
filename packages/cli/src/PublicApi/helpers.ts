/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable import/no-cycle */
import * as querystring from 'querystring';
// eslint-disable-next-line import/no-extraneous-dependencies
import { pick } from 'lodash';
import { In } from 'typeorm';
import { validate as uuidValidate } from 'uuid';
import { User } from '../databases/entities/User';
import type { Role } from '../databases/entities/Role';
import { ActiveWorkflowRunner, Db, InternalHooksManager, ITelemetryUserDeletionData } from '..';
import { getInstanceBaseUrl } from '../UserManagement/UserManagementHelper';
import * as UserManagementMailer from '../UserManagement/email';
import { SharedWorkflow } from '../databases/entities/SharedWorkflow';
import { SharedCredentials } from '../databases/entities/SharedCredentials';
import { WorkflowEntity } from '../databases/entities/WorkflowEntity';

interface IPaginationOffsetDecoded {
	offset: number;
	limit: number;
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

export const encodeNextCursor = (
	offset: number,
	limit: number,
	numberOfRecords: number,
): string | null => {
	const retrieveRecordsLength = offset + limit;

	if (retrieveRecordsLength < numberOfRecords) {
		return Buffer.from(
			JSON.stringify({
				limit,
				offset: offset + limit,
			}),
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

export async function getUser(data: {
	withIdentifier: string;
	includeRole?: boolean;
}): Promise<User | undefined> {
	return Db.collections.User?.findOne({
		where: {
			...(uuidValidate(data.withIdentifier) && { id: data.withIdentifier }),
			...(!uuidValidate(data.withIdentifier) && { email: data.withIdentifier }),
		},
		relations: data?.includeRole ? ['globalRole'] : undefined,
	});
}

export async function getUsers(data: {
	includeRole?: boolean;
	withIdentifiers: string[];
}): Promise<User[] | undefined> {
	return Db.collections.User?.find({
		where: {
			...(uuidValidate(data.withIdentifiers[0]) && { id: In(data.withIdentifiers) }),
			...(!uuidValidate(data.withIdentifiers[0]) && { email: In(data.withIdentifiers) }),
		},
		relations: data?.includeRole ? ['globalRole'] : undefined,
	});
}

export async function getAllUsersAndCount(data: {
	includeRole?: boolean;
	limit?: number;
	offset?: number;
}): Promise<[User[], number]> {
	const users = await Db.collections.User!.find({
		where: {},
		relations: data?.includeRole ? ['globalRole'] : undefined,
		skip: data.offset,
		take: data.limit,
	});
	const count = await Db.collections.User!.count();
	return [users, count];
}

export async function transferWorkflowsAndCredentials(data: {
	fromUser: User;
	toUser: User;
}): Promise<void> {
	return Db.transaction(async (transactionManager) => {
		await transactionManager.update(SharedWorkflow, { user: data.fromUser }, { user: data.toUser });
		await transactionManager.update(
			SharedCredentials,
			{ user: data.fromUser },
			{ user: data.toUser },
		);
		await transactionManager.delete(User, { id: data.fromUser });
	});
}

async function getSharedWorkflows(data: { fromUser: User }): Promise<SharedWorkflow[] | undefined> {
	return Db.collections.SharedWorkflow?.find({
		relations: ['workflow'],
		where: { user: data.fromUser },
	});
}

async function getSharedCredentials(data: {
	fromUser: User;
}): Promise<SharedCredentials[] | undefined> {
	return Db.collections.SharedCredentials?.find({
		relations: ['credentials'],
		where: { user: data.fromUser },
	});
}

export async function getSharedWorkflowsAndCredentials(data: { fromUser: User }): Promise<{
	workflows: SharedWorkflow[] | undefined;
	credentials: SharedCredentials[] | undefined;
}> {
	return {
		workflows: await getSharedWorkflows(data),
		credentials: await getSharedCredentials(data),
	};
}

async function desactiveWorkflow(data: { workflow: WorkflowEntity }) {
	if (data.workflow.active) {
		const activeWorkflowRunner = ActiveWorkflowRunner.getInstance();
		void activeWorkflowRunner.remove(data.workflow?.id.toString());
	}
	return data.workflow;
}

async function deleteWorkflowsAndCredentials(data: { fromUser: User }): Promise<void> {
	const { credentials: sharedCredentials = [], workflows: sharedWorkflows = [] } =
		await getSharedWorkflowsAndCredentials(data);
	await Db.transaction(async (transactionManager) => {
		const ownedWorkflows = await Promise.all(sharedWorkflows.map(desactiveWorkflow));
		await transactionManager.remove(ownedWorkflows);
		await transactionManager.remove(sharedCredentials.map(({ credentials }) => credentials));
		await transactionManager.delete(User, { id: data.fromUser });
	});
}

export async function sendUserDeleteTelemetry(data: {
	apiKeyOwnerUser: User;
	fromUser: User;
	transferId: string | undefined;
}): Promise<void> {
	const telemetryData: ITelemetryUserDeletionData = {
		user_id: data.apiKeyOwnerUser.id,
		target_user_old_status: data.fromUser.isPending ? 'invited' : 'active',
		target_user_id: data.fromUser.id,
	};

	telemetryData.migration_strategy = data.transferId ? 'transfer_data' : 'delete_data';

	if (data.transferId) {
		telemetryData.migration_user_id = data.transferId;
	}

	void InternalHooksManager.getInstance().onUserDeletion(data.apiKeyOwnerUser.id, telemetryData);
}

export async function deleteDataAndSendTelemetry(data: {
	fromUser: User;
	apiKeyOwnerUser: User;
	transferId: string | undefined;
}): Promise<void> {
	await deleteWorkflowsAndCredentials(data);
	await sendUserDeleteTelemetry(data);
}

export function clean(user: User, options?: { includeRole: boolean }): Partial<User>;
export function clean(users: User[], options?: { includeRole: boolean }): Array<Partial<User>>;

export function clean(
	users: User[] | User,
	options?: { includeRole: boolean },
): Array<Partial<User>> | Partial<User> {
	if (Array.isArray(users)) {
		return users.map((user) =>
			pick(
				user,
				getSelectableProperties('user').concat(options?.includeRole ? ['globalRole'] : []),
			),
		);
	}
	return pick(
		users,
		getSelectableProperties('user').concat(options?.includeRole ? ['globalRole'] : []),
	);
}
