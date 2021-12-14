/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable import/no-cycle */

import * as express from 'express';
import * as passport from 'passport';
import { ExtractJwt } from 'passport-jwt';
import { UserSettings } from 'n8n-core';
import { createHash } from 'crypto';
import { Db, ResponseHelper } from '../..';
import { issueJWT, useJwt } from './jwt';
import config = require('../../../config');

async function generateJwtToken(): Promise<string> {
	const encryptionKey = await UserSettings.getEncryptionKey();
	if (!encryptionKey) {
		throw new Error('Fatal error setting up user management: no encryption key set.');
	}

	// For a key off every other letter from encryption key
	// CAREFUL: do not change this or it breaks all existing tokens.
	let baseKey = '';
	for (let i = 0; i < encryptionKey.length; i++) {
		if (i % 2 === 0) {
			baseKey += encryptionKey[i];
		}
	}
	return createHash('md5').update(baseKey).digest('hex');
}

export async function authenticationRoutes(this: {
	app: express.Application;
	restEndpoint: string;
}): Promise<void> {
	const options = {
		jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
		secretOrKey: (config.get('userManagement.jwtSecret') as string) || (await generateJwtToken()),
	};

	await useJwt(passport, options);
	// ----------------------------------------
	// authentication middleware
	// ----------------------------------------
	this.app.use(passport.initialize());
	this.app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
		// just temp for development
		if (req.url.includes('login')) {
			return next();
		}
		// get access to this from Server.ts
		// if (authIgnoreRegex.exec(req.url)) {
		// 	return next();
		// }
		return passport.authenticate('jwt', { session: false })(req, res, next);
	});

	// ----------------------------------------
	// login a user
	// ----------------------------------------

	this.app.post(
		`/${this.restEndpoint}/login`,
		ResponseHelper.send(async (req: express.Request, res: express.Response) => {
			if (!req.body.email) {
				throw new Error('Email is required to log in');
			}

			if (!req.body.password) {
				throw new Error('Password is required to log in');
			}

			let user;
			try {
				user = await Db.collections.User!.findOne({
					email: req.body.email as string | undefined,
					password: req.body.password as string | undefined,
				});
			} catch (error) {
				throw new Error('Unable to access database.');
			}
			if (!user) {
				const error = new Error('User not found');
				// @ts-ignore
				error.httpStatusCode = 404;
				throw error;
			}

			const userData = await issueJWT(user, options);
			return userData;
		}),
	);
}
