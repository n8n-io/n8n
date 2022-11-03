/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { INode, NodeOperationError, Workflow } from 'n8n-workflow';
import { In } from 'typeorm';
import express from 'express';
import { compare, genSaltSync, hash } from 'bcryptjs';

import * as Db from '@/Db';
import * as ResponseHelper from '@/ResponseHelper';
import { PublicUser } from './Interfaces';
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH, User } from '@db/entities/User';
import { Role } from '@db/entities/Role';
import { AuthenticatedRequest } from '@/requests';
import config from '@/config';
import { getWebhookBaseUrl } from '../WebhookHelpers';

export async function getWorkflowOwner(workflowId: string | number): Promise<User> {
	const sharedWorkflow = await Db.collections.SharedWorkflow.findOneOrFail({
		where: { workflow: { id: workflowId } },
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
	return (
		!config.getEnv('userManagement.disabled') ||
		config.getEnv('userManagement.isInstanceOwnerSetUp')
	);
}

export function isSharingEnabled(): boolean {
	return isUserManagementEnabled() && config.getEnv('enterprise.features.sharing');
}

export function isUserManagementDisabled(): boolean {
	return (
		config.getEnv('userManagement.disabled') &&
		!config.getEnv('userManagement.isInstanceOwnerSetUp')
	);
}

async function getInstanceOwnerRole(): Promise<Role> {
	const ownerRole = await Db.collections.Role.findOneOrFail({
		where: {
			name: 'owner',
			scope: 'global',
		},
	});
	return ownerRole;
}

export async function getInstanceOwner(): Promise<User> {
	const ownerRole = await getInstanceOwnerRole();

	const owner = await Db.collections.User.findOneOrFail({
		relations: ['globalRole'],
		where: {
			globalRole: ownerRole,
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

// TODO: Enforce at model level
export function validatePassword(password?: string): string {
	if (!password) {
		throw new ResponseHelper.ResponseError('Password is mandatory', undefined, 400);
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

		throw new ResponseHelper.ResponseError(message.join(' '), undefined, 400);
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
		...sanitizedUser
	} = user;
	if (withoutKeys) {
		withoutKeys.forEach((key) => {
			// @ts-ignore
			delete sanitizedUser[key];
		});
	}
	return sanitizedUser;
}

export async function getUserById(userId: string): Promise<User> {
	const user = await Db.collections.User.findOneOrFail(userId, {
		relations: ['globalRole'],
	});
	return user;
}

export async function checkPermissionsForExecution(
	workflow: Workflow,
	userId: string,
): Promise<boolean> {
	const credentialIds = new Set();
	const nodeNames = Object.keys(workflow.nodes);
	const credentialUsedBy = new Map();
	// Iterate over all nodes
	nodeNames.forEach((nodeName) => {
		const node = workflow.nodes[nodeName];
		if (node.disabled === true) {
			// If a node is disabled there is no need to check its credentials
			return;
		}
		// And check if any of the nodes uses credentials.
		if (node.credentials) {
			const credentialNames = Object.keys(node.credentials);
			// For every credential this node uses
			credentialNames.forEach((credentialName) => {
				const credentialDetail = node.credentials![credentialName];
				// If it does not contain an id, it means it is a very old
				// workflow. Nowadays it should not happen anymore.
				// Migrations should handle the case where a credential does
				// not have an id.
				if (credentialDetail.id === null) {
					throw new NodeOperationError(
						node,
						`The credential on node '${node.name}' is not valid. Please open the workflow and set it to a valid value.`,
					);
				}
				if (!credentialDetail.id) {
					throw new NodeOperationError(
						node,
						`Error initializing workflow: credential ID not present. Please open the workflow and save it to fix this error. [Node: '${node.name}']`,
					);
				}
				credentialIds.add(credentialDetail.id.toString());
				if (!credentialUsedBy.has(credentialDetail.id)) {
					credentialUsedBy.set(credentialDetail.id, node);
				}
			});
		}
	});

	// Now that we obtained all credential IDs used by this workflow, we can
	// now check if the owner of this workflow has access to all of them.

	const ids = Array.from(credentialIds);

	if (ids.length === 0) {
		// If the workflow does not use any credentials, then we're fine
		return true;
	}
	// If this check happens on top, we may get
	// uninitialized db errors.
	// Db is certainly initialized if workflow uses credentials.
	const user = await getUserById(userId);
	if (user.globalRole.name === 'owner') {
		return true;
	}

	// Check for the user's permission to all used credentials
	const credentialsWithAccess = await Db.collections.SharedCredentials.find({
		where: {
			user: { id: userId },
			credentials: In(ids),
		},
	});

	// Considering the user needs to have access to all credentials
	// then both arrays (allowed credentials vs used credentials)
	// must be the same length
	if (ids.length !== credentialsWithAccess.length) {
		credentialsWithAccess.forEach((credential) => {
			credentialUsedBy.delete(credential.credentialId.toString());
		});

		// Find the first missing node from the Set - this is arbitrarily fetched
		const firstMissingCredentialNode = credentialUsedBy.values().next().value as INode;
		throw new NodeOperationError(
			firstMissingCredentialNode,
			'This node does not have access to the required credential',
			{
				description:
					'Maybe the credential was removed or you have lost access to it. Try contacting the owner if this credential does not belong to you',
			},
		);
	}
	return true;
}

/**
 * Check if a URL contains an auth-excluded endpoint.
 */
export function isAuthExcluded(url: string, ignoredEndpoints: string[]): boolean {
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
