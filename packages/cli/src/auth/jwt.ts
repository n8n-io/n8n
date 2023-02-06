/* eslint-disable @typescript-eslint/no-non-null-assertion */

import jwt from 'jsonwebtoken';
import type { Response } from 'express';
import { createHash } from 'crypto';
import * as Db from '@/Db';
import { AUTH_COOKIE_NAME } from '@/constants';
import type { JwtPayload, JwtToken } from '@/Interfaces';
import type { User } from '@db/entities/User';
import config from '@/config';
import * as ResponseHelper from '@/ResponseHelper';

export function issueJWT(user: User): JwtToken {
	const { id, email, password } = user;
	const expiresIn = 7 * 86400000; // 7 days

	const payload: JwtPayload = {
		id,
		email,
		password: password ?? null,
	};

	if (password) {
		payload.password = createHash('sha256')
			.update(password.slice(password.length / 2))
			.digest('hex');
	}

	const signedToken = jwt.sign(payload, config.getEnv('userManagement.jwtSecret'), {
		expiresIn: expiresIn / 1000 /* in seconds */,
		algorithm: 'HS256',
	});

	return {
		token: signedToken,
		expiresIn,
	};
}

export async function resolveJwtContent(jwtPayload: JwtPayload): Promise<User> {
	const user = await Db.collections.User.findOne({
		where: { id: jwtPayload.id },
		relations: ['globalRole'],
	});

	let passwordHash = null;
	if (user?.password) {
		passwordHash = createHash('sha256')
			.update(user.password.slice(user.password.length / 2))
			.digest('hex');
	}

	// currently only LDAP users during synchronization
	// can be set to disabled
	if (user?.disabled) {
		throw new ResponseHelper.AuthError('Unauthorized');
	}

	if (!user || jwtPayload.password !== passwordHash || user.email !== jwtPayload.email) {
		// When owner hasn't been set up, the default user
		// won't have email nor password (both equals null)
		throw new Error('Invalid token content');
	}
	return user;
}

export async function resolveJwt(token: string): Promise<User> {
	const jwtPayload = jwt.verify(token, config.getEnv('userManagement.jwtSecret'), {
		algorithms: ['HS256'],
	}) as JwtPayload;
	return resolveJwtContent(jwtPayload);
}

export async function issueCookie(res: Response, user: User): Promise<void> {
	const userData = issueJWT(user);
	res.cookie(AUTH_COOKIE_NAME, userData.token, {
		maxAge: userData.expiresIn,
		httpOnly: true,
		sameSite: 'lax',
	});
}
