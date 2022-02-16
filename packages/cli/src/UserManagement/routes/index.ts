/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable import/no-cycle */
import cookieParser = require('cookie-parser');
import * as passport from 'passport';
import { Strategy } from 'passport-jwt';
import { NextFunction, Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';

import { JwtPayload, N8nApp } from '../Interfaces';
import { authenticationMethods } from './auth';
import config = require('../../../config');
import { User } from '../../databases/entities/User';
import { issueCookie, resolveJwtContent } from '../auth/jwt';
import { meNamespace } from './me';
import { usersNamespace } from './users';
import { passwordResetNamespace } from './passwordReset';
import { AuthenticatedRequest } from '../../requests';
import { ownerNamespace } from './owner';

export function addRoutes(this: N8nApp, ignoredEndpoints: string[], restEndpoint: string): void {
	this.app.use(cookieParser());

	const options = {
		jwtFromRequest: (req: Request) => {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			return (req.cookies?.['n8n-auth'] as string | undefined) ?? null;
		},
		secretOrKey: config.get('userManagement.jwtSecret') as string,
	};

	passport.use(
		new Strategy(options, async function validateCookieContents(jwtPayload: JwtPayload, done) {
			try {
				const user = await resolveJwtContent(jwtPayload);
				return done(null, user);
			} catch (error) {
				return done(null, false, { message: 'User not found' });
			}
		}),
	);

	this.app.use(passport.initialize());

	this.app.use((req: Request, res: Response, next: NextFunction) => {
		if (
			// skip authentication for preflight requests
			req.method === 'OPTIONS' ||
			req.url.includes('login') ||
			req.url.includes('logout') ||
			req.url === '/index.html' ||
			req.url.startsWith('/css/') ||
			req.url.startsWith('/js/') ||
			req.url.startsWith('/fonts/') ||
			req.url.startsWith(`/${restEndpoint}/settings`) ||
			req.url === `/${restEndpoint}/user` ||
			req.url.startsWith(`/${restEndpoint}/resolve-signup-token`) ||
			(req.method === 'POST' && new RegExp(`/${restEndpoint}/users/[\\w\\d-]*`).test(req.url)) ||
			req.url.startsWith(`/${restEndpoint}/forgot-password`) ||
			req.url.startsWith(`/${restEndpoint}/resolve-password-token`) ||
			req.url.startsWith(`/${restEndpoint}/change-password`)
		) {
			return next();
		}

		for (let i = 0; i < ignoredEndpoints.length; i++) {
			const path = ignoredEndpoints[i];
			if (!path) {
				// Skip empty paths (they might exist)
				// eslint-disable-next-line no-continue
				continue;
			}
			if (req.url.includes(path)) {
				return next();
			}
		}
		return passport.authenticate('jwt', { session: false })(req, res, next);
	});

	this.app.use((req: Request, res: Response, next: NextFunction) => {
		// req.user is empty for public routes, so just proceed
		// owner can do anything, so proceed as well
		if (req.user === undefined || (req.user && (req.user as User).globalRole.name === 'owner')) {
			next();
			return;
		}

		// Not owner and user exists. We now protect restricted urls.
		const postRestrictedUrls = [`/${this.restEndpoint}/users`];
		const getRestrictedUrls = [`/${this.restEndpoint}/users`];
		const trimmedUrl = req.url.endsWith('/') ? req.url.slice(0, -1) : req.url;
		if (
			(req.method === 'POST' && postRestrictedUrls.includes(trimmedUrl)) ||
			(req.method === 'GET' && getRestrictedUrls.includes(trimmedUrl)) ||
			(req.method === 'DELETE' &&
				new RegExp(`/${restEndpoint}/users/[^/]+`, 'gm').test(trimmedUrl)) ||
			(req.method === 'POST' &&
				new RegExp(`/${restEndpoint}/users/[^/]/reinvite+`, 'gm').test(trimmedUrl))
		) {
			res.status(403).json({ status: 'error', message: 'Unauthorized' });
			return;
		}

		next();
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
	ownerNamespace.apply(this);
	meNamespace.apply(this);
	passwordResetNamespace.apply(this);
	usersNamespace.apply(this);
}
