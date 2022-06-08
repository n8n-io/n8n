/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable import/no-cycle */

import jwt from 'jsonwebtoken';
import { Response } from 'express';
import { createHash } from 'crypto';
import { Db } from '../..';
import { AUTH_COOKIE_NAME } from '../../constants';
import { JwtPayload, JwtToken } from '../Interfaces';
import { User } from '../../databases/entities/User';
import * as config from '../../../config';

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
	});

	return {
		token: signedToken,
		expiresIn,
	};
}

export async function resolveJwtContent(jwtPayload: JwtPayload): Promise<User> {
	const user = await Db.collections.User.findOne(jwtPayload.id, {
		relations: ['globalRole'],
	});

	let passwordHash = null;
	if (user?.password) {
		passwordHash = createHash('sha256')
			.update(user.password.slice(user.password.length / 2))
			.digest('hex');
	}

	if (!user || jwtPayload.password !== passwordHash || user.email !== jwtPayload.email) {
		// When owner hasn't been set up, the default user
		// won't have email nor password (both equals null)
		throw new Error('Invalid token content');
	}
	return user;
}

export async function resolveJwt(token: string): Promise<User> {
	const jwtPayload = jwt.verify(token, config.getEnv('userManagement.jwtSecret')) as JwtPayload;
	return resolveJwtContent(jwtPayload);
}

export async function issueCookie(res: Response, user: User): Promise<void> {
	const userData = issueJWT(user);
	res.cookie(AUTH_COOKIE_NAME, userData.token, { maxAge: userData.expiresIn, httpOnly: true });
}
