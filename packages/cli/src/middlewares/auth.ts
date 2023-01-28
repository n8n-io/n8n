import type { Application, NextFunction, Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import { Strategy } from 'passport-jwt';
import { LoggerProxy as Logger } from 'n8n-workflow';
import type { JwtPayload } from '@/Interfaces';
import type { AuthenticatedRequest } from '@/requests';
import config from '@/config';
import { AUTH_COOKIE_NAME } from '@/constants';
import { issueCookie, resolveJwtContent } from '@/auth/jwt';
import {
	isAuthenticatedRequest,
	isAuthExcluded,
	isPostUsersId,
	isUserManagementDisabled,
} from '@/UserManagement/UserManagementHelper';
import type { Repository } from 'typeorm';
import type { User } from '@db/entities/User';

const jwtFromRequest = (req: Request) => {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
	return (req.cookies?.[AUTH_COOKIE_NAME] as string | undefined) ?? null;
};

const jwtAuth = (): RequestHandler => {
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
const refreshExpiringCookie: RequestHandler = async (req: AuthenticatedRequest, res, next) => {
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

const passportMiddleware = passport.authenticate('jwt', { session: false }) as RequestHandler;

/**
 * This sets up the auth middlewares in the correct order
 */
export const setupAuthMiddlewares = (
	app: Application,
	ignoredEndpoints: Readonly<string[]>,
	restEndpoint: string,
	userRepository: Repository<User>,
) => {
	// needed for testing; not adding overhead since it directly returns if req.cookies exists
	app.use(cookieParser());
	app.use(jwtAuth());

	app.use(async (req: Request, res: Response, next: NextFunction) => {
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
			req.url.startsWith(`/${restEndpoint}/login`) ||
			req.url.startsWith(`/${restEndpoint}/logout`) ||
			req.url.startsWith(`/${restEndpoint}/resolve-signup-token`) ||
			isPostUsersId(req, restEndpoint) ||
			req.url.startsWith(`/${restEndpoint}/forgot-password`) ||
			req.url.startsWith(`/${restEndpoint}/resolve-password-token`) ||
			req.url.startsWith(`/${restEndpoint}/change-password`) ||
			req.url.startsWith(`/${restEndpoint}/oauth2-credential/callback`) ||
			req.url.startsWith(`/${restEndpoint}/oauth1-credential/callback`) ||
			isAuthExcluded(req.url, ignoredEndpoints)
		) {
			return next();
		}

		// skip authentication if user management is disabled
		if (isUserManagementDisabled()) {
			req.user = await userRepository.findOneOrFail({
				relations: ['globalRole'],
				where: {},
			});
			return next();
		}

		return passportMiddleware(req, res, next);
	});

	app.use((req: Request | AuthenticatedRequest, res: Response, next: NextFunction) => {
		// req.user is empty for public routes, so just proceed
		// owner can do anything, so proceed as well
		if (!req.user || (isAuthenticatedRequest(req) && req.user.globalRole.name === 'owner')) {
			next();
			return;
		}
		// Not owner and user exists. We now protect restricted urls.
		const postRestrictedUrls = [
			`/${restEndpoint}/users`,
			`/${restEndpoint}/owner`,
			`/${restEndpoint}/ldap/sync`,
			`/${restEndpoint}/ldap/test-connection`,
		];
		const getRestrictedUrls = [
			`/${restEndpoint}/users`,
			`/${restEndpoint}/ldap/sync`,
			`/${restEndpoint}/ldap/config`,
		];
		const putRestrictedUrls = [`/${restEndpoint}/ldap/config`];
		const trimmedUrl = req.url.endsWith('/') ? req.url.slice(0, -1) : req.url;
		if (
			(req.method === 'POST' && postRestrictedUrls.includes(trimmedUrl)) ||
			(req.method === 'GET' && getRestrictedUrls.includes(trimmedUrl)) ||
			(req.method === 'PUT' && putRestrictedUrls.includes(trimmedUrl)) ||
			(req.method === 'DELETE' &&
				new RegExp(`/${restEndpoint}/users/[^/]+`, 'gm').test(trimmedUrl)) ||
			(req.method === 'POST' &&
				new RegExp(`/${restEndpoint}/users/[^/]+/reinvite`, 'gm').test(trimmedUrl)) ||
			new RegExp(`/${restEndpoint}/owner/[^/]+`, 'gm').test(trimmedUrl)
		) {
			Logger.verbose('User attempted to access endpoint without authorization', {
				endpoint: `${req.method} ${trimmedUrl}`,
				userId: isAuthenticatedRequest(req) ? req.user.id : 'unknown',
			});
			res.status(403).json({ status: 'error', message: 'Unauthorized' });
			return;
		}

		next();
	});

	app.use(refreshExpiringCookie);
};
