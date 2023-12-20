import { In } from 'typeorm';
import { Container } from 'typedi';

import type { WhereClause } from '@/Interfaces';
import type { User } from '@db/entities/User';
import config from '@/config';
import { License } from '@/License';
import { getWebhookBaseUrl } from '@/WebhookHelpers';
import { UserRepository } from '@db/repositories/user.repository';
import type { Scope } from '@n8n/permissions';

export function isSharingEnabled(): boolean {
	return Container.get(License).isSharingEnabled();
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

export async function getUserById(userId: string): Promise<User> {
	const user = await Container.get(UserRepository).findOneOrFail({
		where: { id: userId },
		relations: ['globalRole'],
	});
	return user;
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
	globalScope,
	entityId = '',
	roles = [],
}: {
	user: User;
	entityType: 'workflow' | 'credentials';
	globalScope: Scope;
	entityId?: string;
	roles?: string[];
}): WhereClause {
	const where: WhereClause = entityId ? { [entityType]: { id: entityId } } : {};

	if (!user.hasGlobalScope(globalScope)) {
		where.user = { id: user.id };
		if (roles?.length) {
			where.role = { name: In(roles) };
		}
	}

	return where;
}
