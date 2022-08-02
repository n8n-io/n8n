/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable import/no-cycle */
import cookieParser from 'cookie-parser';
import { NextFunction, Request, Response } from 'express';
import expressSession from 'express-session';
import jwt from 'jsonwebtoken';
import { LoggerProxy as Logger } from 'n8n-workflow';
import { generators, Issuer, Strategy as OIDCStrategy } from 'openid-client';
import passport from 'passport';
import { Strategy as JwtStrategy } from 'passport-jwt';

import { Db } from '../..';
import * as config from '../../../config';
import { AUTH_COOKIE_NAME } from '../../constants';
import { AuthenticatedRequest } from '../../requests';
import { issueCookie, resolveJwtContent } from '../auth/jwt';
import { JwtPayload, N8nApp } from '../Interfaces';
import {
	isAuthenticatedRequest,
	isAuthExcluded,
	isPostUsersId,
	isUserManagementDisabled,
} from '../UserManagementHelper';
import { authenticationMethods } from './auth';
import { meNamespace } from './me';
import { ownerNamespace } from './owner';
import { passwordResetNamespace } from './passwordReset';
import { usersNamespace } from './users';

export function addRoutes(this: N8nApp, ignoredEndpoints: string[], restEndpoint: string): void {
	// needed for testing; not adding overhead since it directly returns if req.cookies exists
	this.app.use(cookieParser());

	this.app.use(
		expressSession({
			secret: 'keyboard cat',
			resave: false,
			saveUninitialized: true,
		}),
	);

	const options = {
		jwtFromRequest: (req: Request) => {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			return (req.cookies?.[AUTH_COOKIE_NAME] as string | undefined) ?? null;
		},
		secretOrKey: config.getEnv('userManagement.jwtSecret'),
	};

	passport.use(
		new JwtStrategy(options, async function validateCookieContents(jwtPayload: JwtPayload, done) {
			try {
				const user = await resolveJwtContent(jwtPayload);
				return done(null, user);
			} catch (error) {
				Logger.debug('Failed to extract user from JWT payload', { jwtPayload });
				return done(null, false, { message: 'User not found' });
			}
		}),
	);

	const CLIENT_ID = '974645230259-j5m3mbld4ibqqmmbvt3a174vn65d21fo.apps.googleusercontent.com';
	const CLIENT_SECRET = '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';
	const REDIRECT_URI_BASE = 'http://localhost:5678';

	const initOIDC = async () => {
		const googleIssuer = await Issuer.discover('https://accounts.google.com');

		/* Authorize Code Flow */
		const client = new googleIssuer.Client({
			client_id: CLIENT_ID,
			client_secret: CLIENT_SECRET,
			redirect_uris: [`${REDIRECT_URI_BASE}/rest/login/openid/callback/`],
			response_types: ['code'],
			token_endpoint_auth_method: 'client_secret_post',
		});

		/* params object */
		const params = {
			client_id: CLIENT_ID,
			response_type: 'code',
			scope: 'openid email profile',
			nonce: generators.nonce(),
			redirect_uri: `${REDIRECT_URI_BASE}/rest/login/openid/callback/`,
		};

		passport.use(
			'openid',
			new OIDCStrategy({ client, params }, async (tokenset, userinfo, done) => {
				const tokenData = tokenset.claims();

				const federatedUser = await Db.collections.FederatedUser.findOne({
					where: { identifier: userinfo.sub, issuer: tokenData.iss },
				});

				if (federatedUser) {
					const user = await Db.collections.User.findOne(federatedUser.userId, {
						relations: ['globalRole'],
					});
					return done(null, user);
				}

				if (!userinfo.email_verified) {
					return done('Unverified email address from provider');
				}

				let user = await Db.collections.User.findOne({
					where: { email: userinfo.email },
					relations: ['globalRole'],
				});

				if (!user) {
					throw new Error('User not found!');
				}

				await Db.collections.FederatedUser.insert({
					user,
					identifier: userinfo.sub,
					issuer: tokenData.iss,
				});

				user.firstName = userinfo.given_name;
				user.lastName = userinfo.family_name;

				user = await Db.collections.User.save(user);

				return done(null, user);
			}),
		);
	};
	void initOIDC();

	this.app.use(passport.initialize());
	this.app.use(passport.session());

	passport.serializeUser((user, done) => {
		done(null, user);
	});
	passport.deserializeUser((user, done) => {
		done(null, user);
	});

	/* Endpoints */
	this.app.get(`/${restEndpoint}/login/openid`, passport.authenticate('openid'));

	this.app.get(
		`/${restEndpoint}/login/openid/callback`,
		passport.authenticate('openid', {
			failureRedirect: `/${restEndpoint}/login/openid`,
		}),
		async (req, res) => {
			if (!req.user) {
				return res.redirect(`/${restEndpoint}/login/openid`);
			}
			await issueCookie(res, req.user);
			res.redirect('/');
		},
	);

	this.app.use(async (req: Request, res: Response, next: NextFunction) => {
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
			req.user = await Db.collections.User.findOneOrFail(
				{},
				{
					relations: ['globalRole'],
				},
			);
			return next();
		}

		return passport.authenticate('jwt', { session: false })(req, res, next);
	});

	this.app.use((req: Request | AuthenticatedRequest, res: Response, next: NextFunction) => {
		// req.user is empty for public routes, so just proceed
		// owner can do anything, so proceed as well
		if (!req.user || (isAuthenticatedRequest(req) && req.user.globalRole.name === 'owner')) {
			next();
			return;
		}
		// Not owner and user exists. We now protect restricted urls.
		const postRestrictedUrls = [`/${this.restEndpoint}/users`, `/${this.restEndpoint}/owner`];
		const getRestrictedUrls = [`/${this.restEndpoint}/users`];
		const trimmedUrl = req.url.endsWith('/') ? req.url.slice(0, -1) : req.url;
		if (
			(req.method === 'POST' && postRestrictedUrls.includes(trimmedUrl)) ||
			(req.method === 'GET' && getRestrictedUrls.includes(trimmedUrl)) ||
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
