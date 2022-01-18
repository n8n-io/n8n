/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable import/no-cycle */
import { IsNull, Not } from 'typeorm';
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

export async function getWorkflowOwner(workflowId: string) {
	const workflowDb = await Db.collections.Workflow!.findOneOrFail(workflowId, {
		relations: ['shared', 'shared.user', 'shared.user.globalRole'],
	});

	return workflowDb.shared[0].user;
}

export async function getInstanceowner() {
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

export function isValidEmail(email: string): boolean {
	return !!/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.exec(
		String(email).toLowerCase(),
	);
}

export function validatePassword(password?: string) {
	if (!password) {
		throw new ResponseHelper.ResponseError('Password is mandatory', undefined, 400);
	}

	if (password.length <= 8 && password.length >= 64) {
		throw new ResponseHelper.ResponseError(
			'Password length must be longer than or equal to 8 characters and shorter than or equal to 64 characters',
			undefined,
			400,
		);
	}

	return password;
}

export function generatePublicUserData(user: User): PublicUser {
	const { id, email, firstName, lastName, personalizationAnswers, password } = user;
	const returnedUser = {
		id,
	} as PublicUser;

	if (email) {
		returnedUser.email = email;
	}

	if (firstName) {
		returnedUser.firstName = firstName;
	}

	if (lastName) {
		returnedUser.lastName = lastName;
	}

	if (personalizationAnswers) {
		returnedUser.personalizationAnswers = personalizationAnswers;
	}

	if (password) {
		returnedUser.password = password.slice(Math.round(password.length / 2));
	}

	return returnedUser;
}

/**
 * Remove sensitive properties from the user to return to the client.
 */
export function sanitizeUser(user: User) {
	const { password, resetPasswordToken, ...sanitized } = user;

	return sanitized;
}
