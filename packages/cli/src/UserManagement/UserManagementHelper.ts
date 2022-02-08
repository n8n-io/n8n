/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable import/no-cycle */
import { IsNull, Not } from 'typeorm';
import { Db, ResponseHelper } from '..';
import config = require('../../config');
import { User } from '../databases/entities/User';
import { PublicUser } from './Interfaces';

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
