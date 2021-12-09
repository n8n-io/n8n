// @ts-nocheck

import * as express from 'express';
import * as passport from 'passport';
import { Db, ResponseHelper } from '../..';
import { User } from '../databases/entities/User';
import { issueJWT, useJwt } from './jwt';

useJwt(passport);

export function authenticationRoutes(): void {
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

			return issueJWT(user);
		}),
	);
}
