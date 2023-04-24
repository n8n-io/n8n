import type { Application, NextFunction, Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import { Strategy } from 'passport-jwt';
import { sync as globSync } from 'fast-glob';
import { LoggerProxy as Logger } from 'n8n-workflow';
import type { JwtPayload } from '@/Interfaces';
import type { AuthenticatedRequest } from '@/requests';
import config from '@/config';
import { AUTH_COOKIE_NAME, EDITOR_UI_DIST_DIR } from '@/constants';
import { issueCookie, resolveJwtContent } from '@/auth/jwt';
import { isUserManagementEnabled } from '@/UserManagement/UserManagementHelper';
import type { UserRepository } from '@db/repositories';

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

const staticAssets = globSync(['**/*.html', '**/*.svg', '**/*.png', '**/*.ico'], {
	cwd: EDITOR_UI_DIST_DIR,
});

// TODO: delete this
const isPostUsersId = (req: Request, restEndpoint: string): boolean =>
	req.method === 'POST' &&
	new RegExp(`/${restEndpoint}/users/[\\w\\d-]*`).test(req.url) &&
	!req.url.includes('reinvite');

const isAuthExcluded = (url: string, ignoredEndpoints: Readonly<string[]>): boolean =>
	!!ignoredEndpoints
		.filter(Boolean) // skip empty paths
		.find((ignoredEndpoint) => url.startsWith(`/${ignoredEndpoint}`));

/**
 * This sets up the auth middlewares in the correct order
 */
export const setupAuthMiddlewares = (
	app: Application,
	ignoredEndpoints: Readonly<string[]>,
	restEndpoint: string,
	userRepository: UserRepository,
) => {
	// needed for testing; not adding overhead since it directly returns if req.cookies exists
	app.use(cookieParser());
	app.use(jwtAuth());

	app.use(async (req: Request, res: Response, next: NextFunction) => {
		if (
			// TODO: refactor me!!!
			// skip authentication for preflight requests
			req.method === 'OPTIONS' ||
			staticAssets.includes(req.url.slice(1)) ||
			isAuthExcluded(req.url, ignoredEndpoints) ||
			req.url.startsWith(`/${restEndpoint}/settings`) ||
			req.url.startsWith(`/${restEndpoint}/login`) ||
			req.url.startsWith(`/${restEndpoint}/resolve-signup-token`) ||
			isPostUsersId(req, restEndpoint) ||
			req.url.startsWith(`/${restEndpoint}/forgot-password`) ||
			req.url.startsWith(`/${restEndpoint}/resolve-password-token`) ||
			req.url.startsWith(`/${restEndpoint}/change-password`) ||
			req.url.startsWith(`/${restEndpoint}/oauth2-credential/callback`) ||
			req.url.startsWith(`/${restEndpoint}/oauth1-credential/callback`)
		) {
			return next();
		}

		// skip authentication if user management is disabled
		if (!isUserManagementEnabled()) {
			req.user = await userRepository.findOneOrFail({
				relations: ['globalRole'],
				where: {},
			});
			return next();
		}

		return passportMiddleware(req, res, next);
	});

	app.use(refreshExpiringCookie);
};
