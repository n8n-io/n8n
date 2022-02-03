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
import { User } from '../databases/entities/User';
import { PublicUser } from './Interfaces';

// TODO: Remove?
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

// TODO: Remove?
export function isValidEmail(email: string): boolean {
	return !!/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.exec(
		String(email).toLowerCase(),
	);
}

// TODO: Refactor and remove?
export function validatePassword(password?: string) {
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
