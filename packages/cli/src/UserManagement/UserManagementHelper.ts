/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { In } from 'typeorm';
import type express from 'express';
import { compare, genSaltSync, hash } from 'bcryptjs';
import { Container } from 'typedi';

import * as Db from '@/Db';
import * as ResponseHelper from '@/ResponseHelper';
import type { CurrentUser, PublicUser, WhereClause } from '@/Interfaces';
import type { User } from '@db/entities/User';
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '@db/entities/User';
import type { Role } from '@db/entities/Role';
import { RoleRepository } from '@db/repositories';
import type { AuthenticatedRequest } from '@/requests';
import config from '@/config';
import { getWebhookBaseUrl } from '@/WebhookHelpers';
import { License } from '@/License';
import type { PostHogClient } from '@/posthog';

export async function getWorkflowOwner(workflowId: string): Promise<User> {
	const workflowOwnerRole = await Container.get(RoleRepository).findWorkflowOwnerRole();

	const sharedWorkflow = await Db.collections.SharedWorkflow.findOneOrFail({
		where: { workflowId, roleId: workflowOwnerRole?.id ?? undefined },
		relations: ['user', 'user.globalRole'],
	});

	return sharedWorkflow.user;
}

export function isEmailSetUp(): boolean {
	const smtp = config.getEnv('userManagement.emails.mode') === 'smtp';
	const host = !!config.getEnv('userManagement.emails.smtp.host');
	const user = !!config.getEnv('userManagement.emails.smtp.auth.user');
	const pass = !!config.getEnv('userManagement.emails.smtp.auth.pass');

	return smtp && host && user && pass;
}

export function isUserManagementEnabled(): boolean {
	// This can be simplified but readability is more important here

	if (config.getEnv('userManagement.isInstanceOwnerSetUp')) {
		// Short circuit - if owner is set up, UM cannot be disabled.
		// Users must reset their instance in order to do so.
		return true;
	}

	// UM is disabled for desktop by default
	if (config.getEnv('deployment.type').startsWith('desktop_')) {
		return false;
	}

	return config.getEnv('userManagement.disabled') ? false : true;
}

export function isSharingEnabled(): boolean {
	const license = Container.get(License);
	return isUserManagementEnabled() && license.isSharingEnabled();
}

export async function getRoleId(scope: Role['scope'], name: Role['name']): Promise<Role['id']> {
	return Container.get(RoleRepository)
		.findRoleOrFail(scope, name)
		.then((role) => role.id);
}

export async function getInstanceOwner(): Promise<User> {
	const ownerRoleId = await getRoleId('global', 'owner');

	const owner = await Db.collections.User.findOneOrFail({
		relations: ['globalRole'],
		where: {
			globalRoleId: ownerRoleId,
		},
	});
	return owner;
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

/**
 * Remove sensitive properties from the user to return to the client.
 */
export function sanitizeUser(user: User, withoutKeys?: string[]): PublicUser {
	const {
		password,
		resetPasswordToken,
		resetPasswordTokenExpiration,
		updatedAt,
		apiKey,
		authIdentities,
		...rest
	} = user;
	if (withoutKeys) {
		withoutKeys.forEach((key) => {
			// @ts-ignore
			delete rest[key];
		});
	}
	const sanitizedUser: PublicUser = {
		...rest,
		signInType: 'email',
	};
	const ldapIdentity = authIdentities?.find((i) => i.providerType === 'ldap');
	if (ldapIdentity) {
		sanitizedUser.signInType = 'ldap';
	}
	return sanitizedUser;
}

export async function withFeatureFlags(
	postHog: PostHogClient | undefined,
	user: CurrentUser,
): Promise<CurrentUser> {
	if (!postHog) {
		return user;
	}

	// native PostHog implementation has default 10s timeout and 3 retries.. which cannot be updated without affecting other functionality
	// https://github.com/PostHog/posthog-js-lite/blob/a182de80a433fb0ffa6859c10fb28084d0f825c2/posthog-core/src/index.ts#L67
	const timeoutPromise = new Promise<CurrentUser>((resolve) => {
		setTimeout(() => {
			resolve(user);
		}, 1500);
	});

	const fetchPromise = new Promise<CurrentUser>(async (resolve) => {
		user.featureFlags = await postHog.getFeatureFlags(user);
		resolve(user);
	});

	return Promise.race([fetchPromise, timeoutPromise]);
}

export function addInviteLinkToUser(user: PublicUser, inviterId: string): PublicUser {
	if (user.isPending) {
		user.inviteAcceptUrl = generateUserInviteUrl(inviterId, user.id);
	}
	return user;
}

export async function getUserById(userId: string): Promise<User> {
	const user = await Db.collections.User.findOneOrFail({
		where: { id: userId },
		relations: ['globalRole'],
	});
	return user;
}

/**
 * Check if a URL contains an auth-excluded endpoint.
 */
export function isAuthExcluded(url: string, ignoredEndpoints: Readonly<string[]>): boolean {
	return !!ignoredEndpoints
		.filter(Boolean) // skip empty paths
		.find((ignoredEndpoint) => url.startsWith(`/${ignoredEndpoint}`));
}

/**
 * Check if the endpoint is `POST /users/:id`.
 */
export function isPostUsersId(req: express.Request, restEndpoint: string): boolean {
	return (
		req.method === 'POST' &&
		new RegExp(`/${restEndpoint}/users/[\\w\\d-]*`).test(req.url) &&
		!req.url.includes('reinvite')
	);
}

export function isAuthenticatedRequest(request: express.Request): request is AuthenticatedRequest {
	return request.user !== undefined;
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
		// eslint-disable-next-line no-param-reassign
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
