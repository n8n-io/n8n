import type { Application } from 'express';
import basicAuth from 'basic-auth';
// IMPORTANT! Do not switch to anther bcrypt library unless really necessary and
// tested with all possible systems like Windows, Alpine on ARM, FreeBSD, ...
import { compare } from 'bcryptjs';
import type { Config } from '@/config';
import { basicAuthAuthorizationError } from '@/ResponseHelper';

export const setupBasicAuth = (app: Application, config: Config, authIgnoreRegex: RegExp) => {
	const basicAuthUser = config.getEnv('security.basicAuth.user');
	if (basicAuthUser === '') {
		throw new Error('Basic auth is activated but no user got defined. Please set one!');
	}

	const basicAuthPassword = config.getEnv('security.basicAuth.password');
	if (basicAuthPassword === '') {
		throw new Error('Basic auth is activated but no password got defined. Please set one!');
	}

	const basicAuthHashEnabled = config.getEnv('security.basicAuth.hash');

	let validPassword: null | string = null;

	app.use(async (req, res, next) => {
		// Skip basic auth for a few listed endpoints or when instance owner has been setup
		if (authIgnoreRegex.exec(req.url) || config.getEnv('userManagement.isInstanceOwnerSetUp')) {
			return next();
		}
		const realm = 'n8n - Editor UI';
		const basicAuthData = basicAuth(req);

		if (basicAuthData === undefined) {
			// Authorization data is missing
			return basicAuthAuthorizationError(res, realm, 'Authorization is required!');
		}

		if (basicAuthData.name === basicAuthUser) {
			if (basicAuthHashEnabled) {
				if (validPassword === null && (await compare(basicAuthData.pass, basicAuthPassword))) {
					// Password is valid so save for future requests
					validPassword = basicAuthData.pass;
				}

				if (validPassword === basicAuthData.pass && validPassword !== null) {
					// Provided hash is correct
					return next();
				}
			} else if (basicAuthData.pass === basicAuthPassword) {
				// Provided password is correct
				return next();
			}
		}

		// Provided authentication data is wrong
		return basicAuthAuthorizationError(res, realm, 'Authorization data is wrong!');
	});
};
