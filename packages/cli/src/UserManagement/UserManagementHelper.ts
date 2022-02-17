/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable import/no-cycle */
import { Workflow } from 'n8n-workflow';
import { In, IsNull, Not } from 'typeorm';
import { Db, ResponseHelper } from '..';
import config = require('../../config');
import { CredentialsEntity } from '../databases/entities/CredentialsEntity';
import { SharedCredentials } from '../databases/entities/SharedCredentials';
import { SharedWorkflow } from '../databases/entities/SharedWorkflow';
import { User } from '../databases/entities/User';
import { WorkflowEntity } from '../databases/entities/WorkflowEntity';
import { PublicUser } from './Interfaces';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export async function saveWorkflowOwnership(
	workflow: WorkflowEntity,
	user: User,
): Promise<SharedWorkflow | undefined> {
	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	const role = await Db.collections.Role!.findOneOrFail({ name: 'owner', scope: 'workflow' });

	// eslint-disable-next-line consistent-return, @typescript-eslint/return-await
	return await Db.collections.SharedWorkflow?.save({
		role,
		user,
		workflow,
	});
}

export async function saveCredentialOwnership(
	credentials: CredentialsEntity,
	user: User,
): Promise<SharedCredentials> {
	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	const role = await Db.collections.Role!.findOneOrFail({ name: 'owner', scope: 'credential' });

	// eslint-disable-next-line consistent-return, @typescript-eslint/return-await
	return (await Db.collections.SharedCredentials?.save({
		role,
		user,
		credentials,
	})) as SharedCredentials;
}

export async function getWorkflowOwner(workflowId: string | number): Promise<User> {
	const sharedWorkflow = await Db.collections.SharedWorkflow!.findOneOrFail({
		where: { workflow: { id: workflowId } },
		relations: ['user', 'user.globalRole'],
	});

	return sharedWorkflow.user;
}

export async function getInstanceOwner(): Promise<User> {
	const qb = Db.collections.User!.createQueryBuilder('u');
	qb.innerJoin('u.globalRole', 'gr');
	qb.andWhere('gr.name = :name and gr.scope = :scope', { name: 'owner', scope: 'global' });

	const owner = await qb.getOneOrFail();
	return owner;
}

export function isEmailSetup(): boolean {
	const emailMode = config.get('userManagement.emails.mode') as string;
	return !!emailMode;
}

export async function isInstanceOwnerSetup(): Promise<boolean> {
	const users = await Db.collections.User!.find({ email: Not(IsNull()) });
	return users.length !== 0;
}

export function validatePassword(password?: string): string {
	if (!password) {
		throw new ResponseHelper.ResponseError('Password is mandatory', undefined, 400);
	}

	if (password.length < 8 || password.length > 64) {
		throw new ResponseHelper.ResponseError(
			'Password must be 8 to 64 characters long',
			undefined,
			400,
		);
	}

	return password;
}

/**
 * Remove sensitive properties from the user to return to the client.
 */
export function sanitizeUser(user: User): PublicUser {
	const { password, resetPasswordToken, createdAt, updatedAt, ...sanitizedUser } = user;
	return sanitizedUser;
}

async function getCredentialIdByName(name: string): Promise<string | number | null> {
	const credential = await Db.collections.Credentials!.findOne({
		where: {
			name,
		},
	});
	if (credential) {
		return credential.id;
	}
	return null;
}

export async function getUserById(userId: string): Promise<User> {
	const user = await Db.collections.User!.findOneOrFail({
		where: { id: userId },
		relations: ['globalRole'],
	});
	return user;
}

export async function checkPermissionsForExecution(
	workflow: Workflow,
	userId: string,
): Promise<void> {
	const credentialIds = new Set();
	const nodeNames = Object.keys(workflow.nodes);
	const pendingPromises = [] as Array<Promise<string | number | null>>;
	nodeNames.forEach((nodeName) => {
		const node = workflow.nodes[nodeName];
		if (node.credentials) {
			const credentialNames = Object.keys(node.credentials);
			credentialNames.forEach((credentialName) => {
				const credentialDetail = node.credentials![credentialName];
				if (credentialDetail.id) {
					credentialIds.add(credentialDetail.id.toString());
				} else {
					pendingPromises.push(getCredentialIdByName(credentialDetail.name));
				}
			});
		}
	});

	const fullfilledPromises = await Promise.all(pendingPromises);
	fullfilledPromises.forEach((credentialId) => {
		if (credentialId !== null) {
			credentialIds.add(credentialId.toString());
		} else {
			throw new Error('One or more of the required credentials was not found in the database.');
		}
	});
	// We converted all IDs to string so that the set cannot contain duplicates.

	const ids = Array.from(credentialIds);

	if (ids.length === 0) {
		return;
	}

	const credentialCount = await Db.collections.SharedCredentials!.count({
		where: {
			user: { id: userId },
			credentials: In(ids),
		},
	});

	if (ids.length !== credentialCount) {
		throw new Error('One or more of the required credentials was not found in the database.');
	}
}
