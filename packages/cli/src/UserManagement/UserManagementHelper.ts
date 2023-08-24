import { In } from '@n8n/typeorm';
import { compare, genSaltSync, hash } from 'bcryptjs';
import { Container } from 'typedi';

import * as Db from '@/Db';
import * as ResponseHelper from '@/ResponseHelper';
import type { WhereClause } from '@/Interfaces';
import type { User } from '@db/entities/User';
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '@db/entities/User';
import config from '@/config';
import { License } from '@/License';
import { getWebhookBaseUrl } from '@/WebhookHelpers';
import { RoleService } from '@/services/role.service';

export function isEmailSetUp(): boolean {
	const smtp = config.getEnv('userManagement.emails.mode') === 'smtp';
	const host = !!config.getEnv('userManagement.emails.smtp.host');

	return smtp && host;
}

export function isSharingEnabled(): boolean {
	return Container.get(License).isSharingEnabled();
}

export async function getInstanceOwner() {
	const globalOwnerRole = await Container.get(RoleService).findGlobalOwnerRole();

	return Db.collections.User.findOneOrFail({
		relations: ['globalRole'],
		where: {
			globalRoleId: globalOwnerRole.id,
		},
	});
}

/**
 * Return the n8n instance base URL without trailing slash.
 */
export function getInstanceBaseUrl(): string {
	const n8nBaseUrl = config.getEnv('editorBaseUrl') || getWebhookBaseUrl();

	return n8nBaseUrl.endsWith('/') ? n8nBaseUrl.slice(0, n8nBaseUrl.length - 1) : n8nBaseUrl;
}

export function generateUserInviteUrl(inviterId: string, inviteeId: string): string {
	return `${getInstanceBaseUrl()}/signup?inviterId=${inviterId}&inviteeId=${inviteeId}`;
}

// TODO: Enforce at model level
export function validatePassword(password?: string): string {
	if (!password) {
		throw new ResponseHelper.BadRequestError('Password is mandatory');
	}

	const hasInvalidLength =
		password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH;

	const hasNoNumber = !/\d/.test(password);

	const hasNoUppercase = !/[A-Z]/.test(password);

	if (hasInvalidLength || hasNoNumber || hasNoUppercase) {
		const message: string[] = [];

		if (hasInvalidLength) {
			message.push(
				`Password must be ${MIN_PASSWORD_LENGTH} to ${MAX_PASSWORD_LENGTH} characters long.`,
			);
		}

		if (hasNoNumber) {
			message.push('Password must contain at least 1 number.');
		}

		if (hasNoUppercase) {
			message.push('Password must contain at least 1 uppercase letter.');
		}

		throw new ResponseHelper.BadRequestError(message.join(' '));
	}

	return password;
}

export async function getUserById(userId: string): Promise<User> {
	const user = await Db.collections.User.findOneOrFail({
		where: { id: userId },
		relations: ['globalRole'],
	});
	return user;
}

// ----------------------------------
//            hashing
// ----------------------------------

export const hashPassword = async (validPassword: string): Promise<string> =>
	hash(validPassword, genSaltSync(10));

export async function compareHash(plaintext: string, hashed: string): Promise<boolean | undefined> {
	try {
		return await compare(plaintext, hashed);
	} catch (error) {
		if (error instanceof Error && error.message.includes('Invalid salt version')) {
			error.message +=
				'. Comparison against unhashed string. Please check that the value compared against has been hashed.';
		}

		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		throw new Error(error);
	}
}

// return the difference between two arrays
export function rightDiff<T1, T2>(
	[arr1, keyExtractor1]: [T1[], (item: T1) => string],
	[arr2, keyExtractor2]: [T2[], (item: T2) => string],
): T2[] {
	// create map { itemKey => true } for fast lookup for diff
	const keyMap = arr1.reduce<{ [key: string]: true }>((map, item) => {
		map[keyExtractor1(item)] = true;
		return map;
	}, {});

	// diff against map
	return arr2.reduce<T2[]>((acc, item) => {
		if (!keyMap[keyExtractor2(item)]) {
			acc.push(item);
		}
		return acc;
	}, []);
}

/**
 * Build a `where` clause for a TypeORM entity search,
 * checking for member access if the user is not an owner.
 */
export function whereClause({
	user,
	entityType,
	entityId = '',
	roles = [],
}: {
	user: User;
	entityType: 'workflow' | 'credentials';
	entityId?: string;
	roles?: string[];
}): WhereClause {
	const where: WhereClause = entityId ? { [entityType]: { id: entityId } } : {};

	// TODO: Decide if owner access should be restricted
	if (user.globalRole.name !== 'owner') {
		where.user = { id: user.id };
		if (roles?.length) {
			where.role = { name: In(roles) };
		}
	}

	return where;
}
