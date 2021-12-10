/* eslint-disable import/no-cycle */
// @ts-nocheck

import * as express from 'express';
import * as passport from 'passport';
import { ExtractJwt } from 'passport-jwt';
import { UserSettings } from 'n8n-core';
import { createHash } from 'crypto';
import { Db, ResponseHelper } from '../..';
import { User } from '../databases/entities/User';
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

export async function authenticationRoutes(): void {
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

	this.app.get(
		`/${this.restEndpoint}/login`,
		ResponseHelper.send(async (req: express.Request, res: express.Response) => {
			const user = await Db.collections.User!.findOne({ firstName: 'Ben' });

			return issueJWT(user, options);
		}),
	);
}
