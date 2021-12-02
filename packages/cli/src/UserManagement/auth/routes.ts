// @ts-nocheck

import * as express from 'express';
import * as passport from 'passport';
import { Db, ResponseHelper } from '..';
import { User } from '../databases/entities/User';
import { issueJWT } from './jwt';

export function authenticationRoutes(): void {
	// ----------------------------------------
	// authentication middleware
	// ----------------------------------------
	this.app.use(passport.initialize());
	this.app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
		passport.authenticate('jwt', { session: false });
		next();
	});

	// ----------------------------------------
	// login a user
	// ----------------------------------------

	this.app.post(
		`/${this.restEndpoint}/login`,
		ResponseHelper.send(async (req: express.Request, res: express.Response) => {
			const user = await Db.collections.User!.findOne({ firstName: 'Ben' });

			const tokenObject = issueJWT(user);
			res.status(200).json({ success: true, token: tokenObject.token });
		}),
	);
}
