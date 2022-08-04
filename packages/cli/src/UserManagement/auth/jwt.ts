/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable import/no-cycle */
import { createHash } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Db } from '../..';
import config from '../../../config';
import { AUTH_COOKIE_NAME } from '../../constants';
import { User } from '../../databases/entities/User';
import { AuthenticatedRequest } from '../../requests';
import { JwtPayload, JwtToken } from '../Interfaces';

export function jwtFromRequest(req: Request): string | null {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
	return (req.cookies?.[AUTH_COOKIE_NAME] as string | undefined) ?? null;
}

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

// middleware to refresh cookie before it expires
export async function refreshCookie(
	req: AuthenticatedRequest,
	res: Response,
	next: NextFunction,
): Promise<void> {
	const cookieAuth = jwtFromRequest(req);
	if (cookieAuth && req.user) {
		const cookieContents = jwt.decode(cookieAuth) as JwtPayload & { exp: number };
		if (cookieContents.exp * 1000 - Date.now() < 259200000) {
			// if cookie expires in < 3 days, renew it.
			await issueCookie(res, req.user);
		}
	}
	next();
}
