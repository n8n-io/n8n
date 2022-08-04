/* eslint-disable import/no-cycle */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import expressSession from 'express-session';
import { LoggerProxy as Logger } from 'n8n-workflow';
import { Issuer, Strategy as OIDCStrategy } from 'openid-client';
import passport from 'passport';
import { Strategy as JwtStrategy } from 'passport-jwt';
import config from '../../../config';
import type { User } from '../../databases/entities/User';
import type { JwtPayload, N8nApp } from '../Interfaces';
import { getInstanceBaseUrl } from '../UserManagementHelper';
import { jwtFromRequest, resolveJwtContent } from './jwt';
import { oidcHandler } from './oidc';

export async function initializePassport(this: N8nApp): Promise<void> {
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

	if (config.getEnv('security.oidc.enabled')) {
		this.app.use(
			expressSession({
				secret: config.getEnv('userManagement.jwtSecret'),
				resave: false,
				saveUninitialized: true,
			}),
		);

		const issuer = await Issuer.discover(config.getEnv('security.oidc.issuerUrl'));

		const client = new issuer.Client({
			client_id: config.getEnv('security.oidc.clientId'),
			client_secret: config.getEnv('security.oidc.clientSecret'),
			redirect_uris: [`${getInstanceBaseUrl()}/${this.restEndpoint}/login/openid/callback`],
			response_types: JSON.parse(config.getEnv('security.oidc.responseTypes')) as string[],
			token_endpoint_auth_method: config.getEnv('security.oidc.tokenEndpointAuthMethod'),
		});

		const params = {
			scope: config.getEnv('security.oidc.scope'),
		};

		passport.use('openid', new OIDCStrategy({ client, params }, oidcHandler));

		passport.serializeUser((user, done) => {
			done(null, user);
		});
		passport.deserializeUser((user: User, done) => {
			done(null, user);
		});
	}

	this.app.use(passport.initialize());
	this.app.use(passport.session());
}
