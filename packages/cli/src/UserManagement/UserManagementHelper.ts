/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable import/no-cycle */
import express = require('express');
import { IsNull, Not } from 'typeorm';
import { Db, GenericHelpers, ResponseHelper } from '..';
import config = require('../../config');
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH, User } from '../databases/entities/User';
import { AuthenticatedRequest } from '../requests';
import { PublicUser } from './Interfaces';

export const isEmailSetUp = Boolean(config.get('userManagement.emails.mode'));

/**
 * Return the n8n instance base URL without trailing slash.
 */
export function getInstanceBaseUrl(): string {
	const baseUrl = GenericHelpers.getBaseUrl();
	return baseUrl.endsWith('/') ? baseUrl.slice(0, baseUrl.length - 1) : baseUrl;
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
			`Password must be ${MIN_PASSWORD_LENGTH} to ${MAX_PASSWORD_LENGTH} characters long`,
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
	const {
		password,
		resetPasswordToken,
		resetPasswordTokenExpiration,
		createdAt,
		updatedAt,
		apiKey,
		...sanitizedUser
	} = user;
	return sanitizedUser;
}

export function isAuthenticatedRequest(request: express.Request): request is AuthenticatedRequest {
	return request.user !== undefined;
}
