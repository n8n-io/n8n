/* eslint-disable import/no-cycle */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Request, Response } from 'express';
import { compare } from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { IDataObject } from 'n8n-workflow';
import { Db, ResponseHelper } from '../..';
import { issueJWT } from '../auth/jwt';
import { N8nApp, PublicUserData } from '../Interfaces';
import config = require('../../../config');
import { sanitizeUser, isInstanceOwnerSetup } from '../UserManagementHelper';
import { User } from '../../databases/entities/User';

export function addAuthenticationMethods(this: N8nApp): void {
	// ----------------------------------------
	// login a user
	// ----------------------------------------

	this.app.post(
		`/${this.restEndpoint}/login`,
		ResponseHelper.send(async (req: Request, res: Response): Promise<PublicUserData> => {
			if (!req.body.email) {
				throw new Error('Email is required to log in');
			}

			if (!req.body.password) {
				throw new Error('Password is required to log in');
			}

			let user;
			try {
				user = await Db.collections.User!.findOne({
					email: req.body.email as string,
				});
			} catch (error) {
				throw new Error('Unable to access database.');
			}
			if (!user || !user.password || !(await compare(req.body.password, user.password))) {
				// password is empty until user signs up
				const error = new Error('Username or password invalid');
				// @ts-ignore
				error.httpStatusCode = 401;
				throw error;
			}

			const userData = await issueJWT(user);
			res.cookie('n8n-auth', userData.token, { maxAge: userData.expiresIn, httpOnly: true });

			return sanitizeUser(user);
		}),
	);

	this.app.get(
		`/${this.restEndpoint}/login`,
		ResponseHelper.send(async (req: Request, res: Response): Promise<PublicUserData> => {
			// Manually check the existing cookie.

			const cookieContents = req.cookies?.['n8n-auth'] as string | undefined;

			if (cookieContents) {
				// If logged in, return user data (basically cookie contents)
				try {
					const tokenInfo = jwt.verify(
						cookieContents,
						config.get('userManagement.jwtSecret') as string,
					) as PublicUserData;
					return tokenInfo;
				} catch (error) {
					throw new Error('Invalid login information');
				}
			}

			if (await isInstanceOwnerSetup()) {
				const error = new Error('Not logged in');
				// @ts-ignore
				error.httpStatusCode = 401;
				throw error;
			}

			let user: User;
			try {
				user = await Db.collections.User!.findOneOrFail();
			} catch (error) {
				throw new Error(
					'No users found in database - did you wipe the users table? Create at least one user.',
				);
			}

			if (user.email || user.password) {
				throw new Error('Invalid database state - user has password set.');
			}

			const userData = await issueJWT(user);
			res.cookie('n8n-auth', userData.token, { maxAge: userData.expiresIn, httpOnly: true });
			return sanitizeUser(user);
		}),
	);

	this.app.get(
		`/${this.restEndpoint}/logout`,
		ResponseHelper.send(async (req: Request, res: Response): Promise<IDataObject> => {
			res.clearCookie('n8n-auth');
			return {
				loggedOut: true,
			};
		}),
	);
}
