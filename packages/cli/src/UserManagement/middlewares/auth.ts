/* eslint-disable import/no-cycle */
import { Request, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { Strategy } from 'passport-jwt';
import { LoggerProxy as Logger } from 'n8n-workflow';
import { JwtPayload } from '../Interfaces';
import type { AuthenticatedRequest } from '../../requests';
import * as config from '../../../config';
import { AUTH_COOKIE_NAME } from '../../constants';
import { issueCookie, resolveJwtContent } from '../auth/jwt';

const jwtFromRequest = (req: Request) => {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
	return (req.cookies?.[AUTH_COOKIE_NAME] as string | undefined) ?? null;
};

export const jwtAuth = (): RequestHandler => {
	const jwtStrategy = new Strategy(
		{
			jwtFromRequest,
			secretOrKey: config.getEnv('userManagement.jwtSecret'),
		},
		async (jwtPayload: JwtPayload, done) => {
			try {
				const user = await resolveJwtContent(jwtPayload);
				return done(null, user);
			} catch (error) {
				Logger.debug('Failed to extract user from JWT payload', { jwtPayload });
				return done(null, false, { message: 'User not found' });
			}
		},
	);

	passport.use(jwtStrategy);
	return passport.initialize();
};

/**
 * middleware to refresh cookie before it expires
 */
export const refreshExpiringCookie: RequestHandler = async (
	req: AuthenticatedRequest,
	res,
	next,
) => {
	const cookieAuth = jwtFromRequest(req);
	if (cookieAuth && req.user) {
		const cookieContents = jwt.decode(cookieAuth) as JwtPayload & { exp: number };
		if (cookieContents.exp * 1000 - Date.now() < 259200000) {
			// if cookie expires in < 3 days, renew it.
			await issueCookie(res, req.user);
		}
	}
	next();
};
