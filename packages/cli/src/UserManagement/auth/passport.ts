/* eslint-disable import/no-cycle */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import expressSession from 'express-session';
import { LoggerProxy as Logger } from 'n8n-workflow';
import { Issuer, Strategy as OIDCStrategy } from 'openid-client';
import passport from 'passport';
import { Strategy as JwtStrategy } from 'passport-jwt';
import config from '../../../config';
import type { JwtPayload, N8nApp } from '../Interfaces';
import { jwtFromRequest, resolveJwtContent } from './jwt';
import { oidcHandler } from './oidc';

export async function initializePassport(this: N8nApp): Promise<void> {
	this.app.use(
		expressSession({
			secret: config.getEnv('userManagement.jwtSecret'),
			resave: false,
			saveUninitialized: true,
		}),
	);

	passport.use(
		new JwtStrategy(
			{
				jwtFromRequest,
				secretOrKey: config.getEnv('userManagement.jwtSecret'),
			},
			async function validateCookieContents(jwtPayload: JwtPayload, done) {
				try {
					const user = await resolveJwtContent(jwtPayload);
					return done(null, user);
				} catch (error) {
					Logger.debug('Failed to extract user from JWT payload', { jwtPayload });
					return done(null, false, { message: 'User not found' });
				}
			},
		),
	);

	const CLIENT_ID = '974645230259-20eu4aen132u8ptjr35ohd13v3jum039.apps.googleusercontent.com';
	const CLIENT_SECRET = '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';
	const REDIRECT_URI_BASE = 'http://localhost:5678';

	const issuer = await Issuer.discover('https://accounts.google.com');

	/* Authorize Code Flow */
	const client = new issuer.Client({
		client_id: CLIENT_ID,
		client_secret: CLIENT_SECRET,
		redirect_uris: [`${REDIRECT_URI_BASE}/rest/login/openid/callback/`],
		token_endpoint_auth_method: 'client_secret_post',
	});

	const params = {
		scope: 'openid email profile',
	};

	passport.use('openid', new OIDCStrategy({ client, params }, oidcHandler));

	passport.serializeUser((user, done) => {
		done(null, user);
	});
	passport.deserializeUser((user: Express.User, done) => {
		done(null, user);
	});

	this.app.use(passport.initialize());
	this.app.use(passport.session());
}
