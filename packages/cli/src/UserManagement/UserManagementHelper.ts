/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable import/no-cycle */
import { IsNull, Not } from 'typeorm';
import { Db } from '..';
import config = require('../../config');
import { CredentialsEntity } from '../databases/entities/CredentialsEntity';
import { SharedCredentials } from '../databases/entities/SharedCredentials';
import { SharedWorkflow } from '../databases/entities/SharedWorkflow';
import { User } from '../databases/entities/User';
import { WorkflowEntity } from '../databases/entities/WorkflowEntity';
import { PublicUserData } from './Interfaces';

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

export function isValidPassword(password: string) {
	return password.length >= 8 && password.length <= 64;
}

export function generatePublicUserData(user: User): PublicUserData {
	const { id, email, firstName, lastName, personalizationAnswers } = user;
	const returnedUser = {
		id,
	} as PublicUserData;

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

	return returnedUser;
}

/**
 * Remove sensitive properties from the user to return to the client.
 */
export function sanitizeUser(user: User) {
	const { password, resetPasswordToken, ...rest } = user;

	return rest;
}
