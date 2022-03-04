/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable import/no-cycle */
import cookieParser = require('cookie-parser');
import * as passport from 'passport';
import { Strategy } from 'passport-jwt';
import { NextFunction, Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { LoggerProxy as Logger } from 'n8n-workflow';

import { JwtPayload, N8nApp } from '../Interfaces';
import { authenticationMethods } from './auth';
import config = require('../../../config');
import { AUTH_COOKIE_NAME } from '../../constants';
import { issueCookie, resolveJwtContent } from '../auth/jwt';
import { AuthenticatedRequest } from '../../requests';
import { isAuthExcluded, isPostUsersId } from '../UserManagementHelper';

export function addRoutes(this: N8nApp, ignoredEndpoints: string[], restEndpoint: string): void {
	// needed for testing; not adding overhead since it directly returns if req.cookies exists
	this.app.use(cookieParser());

	const options = {
		jwtFromRequest: (req: Request) => {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			return (req.cookies?.[AUTH_COOKIE_NAME] as string | undefined) ?? null;
		},
		secretOrKey: config.get('userManagement.jwtSecret') as string,
	};

	passport.use(
		new Strategy(options, async function validateCookieContents(jwtPayload: JwtPayload, done) {
			try {
				const user = await resolveJwtContent(jwtPayload);
				return done(null, user);
			} catch (error) {
				Logger.debug('Failed to extract user from JWT payload', { jwtPayload });
				return done(null, false, { message: 'User not found' });
			}
		}),
	);

	this.app.use(passport.initialize());

	this.app.use((req: Request, res: Response, next: NextFunction) => {
		if (
			// TODO: refactor me!!!
			// skip authentication for preflight requests
			req.method === 'OPTIONS' ||
			req.url === '/index.html' ||
			req.url === '/favicon.ico' ||
			req.url.startsWith('/css/') ||
			req.url.startsWith('/js/') ||
			req.url.startsWith('/fonts/') ||
			req.url.includes('.svg') ||
			req.url.startsWith(`/${restEndpoint}/settings`) ||
			req.url.includes('login') ||
			req.url.includes('logout') ||
			req.url.startsWith(`/${restEndpoint}/resolve-signup-token`) ||
			isPostUsersId(req, restEndpoint) ||
			req.url.startsWith(`/${restEndpoint}/forgot-password`) ||
			req.url.startsWith(`/${restEndpoint}/resolve-password-token`) ||
			req.url.startsWith(`/${restEndpoint}/change-password`) ||
			isAuthExcluded(req.url, ignoredEndpoints)
		) {
			return next();
		}

		return passport.authenticate('jwt', { session: false })(req, res, next);
	});

	// middleware to refresh cookie before it expires
	this.app.use(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
		const cookieAuth = options.jwtFromRequest(req);
		if (cookieAuth && req.user) {
			const cookieContents = jwt.decode(cookieAuth) as JwtPayload & { exp: number };
			if (cookieContents.exp * 1000 - Date.now() < 259200000) {
				// if cookie expires in < 3 days, renew it.
				await issueCookie(res, req.user);
			}
		}
		next();
	});

	authenticationMethods.apply(this);
}
