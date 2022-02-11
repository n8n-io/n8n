/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable import/no-cycle */
import { IsNull, Not } from 'typeorm';
import { Db, GenericHelpers, ResponseHelper } from '..';
import config = require('../../config');
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH, User } from '../databases/entities/User';
import { PublicUser } from './Interfaces';

export const isEmailSetUp = Boolean(config.get('userManagement.emails.mode'));

export function getInstanceDomain(): string {
	let domain = GenericHelpers.getBaseUrl();
	if (domain.endsWith('/')) {
		domain = domain.slice(0, domain.length - 1);
	}

	return domain;
}

export async function isInstanceOwnerSetup(): Promise<boolean> {
	const users = await Db.collections.User!.find({ email: Not(IsNull()) });
	return users.length !== 0;
}

// TODO: Enforce at model level
export function validatePassword(password?: string): string {
	if (!password) {
		throw new ResponseHelper.ResponseError('Password is mandatory', undefined, 400);
	}

	if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
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
