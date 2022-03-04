/* eslint-disable import/no-cycle */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Request, Response } from 'express';
import { compare } from 'bcryptjs';
import { In } from 'typeorm';
import { IDataObject, LoggerProxy as Logger } from 'n8n-workflow';
import { Db, ResponseHelper } from '../..';
import { AUTH_COOKIE_NAME } from '../../constants';
import { issueCookie, resolveJwt } from '../auth/jwt';
import { N8nApp, PublicUser } from '../Interfaces';
import { isInstanceOwnerSetup, sanitizeUser } from '../UserManagementHelper';
import { User } from '../../databases/entities/User';
import { UserRequest } from '../../requests';

export function authenticationMethods(this: N8nApp): void {
	/**
	 * Log in a user.
	 *
	 * Authless endpoint.
	 */
	this.app.post(
		`/${this.restEndpoint}/login`,
		ResponseHelper.send(async (req: Request, res: Response): Promise<PublicUser> => {
			if (!req.body.email) {
				throw new Error('Email is required to log in');
			}

			if (!req.body.password) {
				throw new Error('Password is required to log in');
			}

			let user;
			try {
				user = await Db.collections.User!.findOne(
					{
						email: req.body.email as string,
					},
					{
						relations: ['globalRole'],
					},
				);
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

			await issueCookie(res, user);

			return sanitizeUser(user);
		}),
	);

	/**
	 * Manually check the `n8n-auth` cookie.
	 */
	this.app.get(
		`/${this.restEndpoint}/login`,
		ResponseHelper.send(async (req: Request, res: Response): Promise<PublicUser> => {
			// Manually check the existing cookie.
			const cookieContents = req.cookies?.[AUTH_COOKIE_NAME] as string | undefined;

			let user: User;
			if (cookieContents) {
				// If logged in, return user
				try {
					user = await resolveJwt(cookieContents);
					return sanitizeUser(user);
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

			try {
				user = await Db.collections.User!.findOneOrFail({ relations: ['globalRole'] });
			} catch (error) {
				throw new Error(
					'No users found in database - did you wipe the users table? Create at least one user.',
				);
			}

			if (user.email || user.password) {
				throw new Error('Invalid database state - user has password set.');
			}

			await issueCookie(res, user);

			return sanitizeUser(user);
		}),
	);

	/**
	 * Log out a user.
	 *
	 * Authless endpoint.
	 */
	this.app.post(
		`/${this.restEndpoint}/logout`,
		ResponseHelper.send(async (req: Request, res: Response): Promise<IDataObject> => {
			res.clearCookie(AUTH_COOKIE_NAME);
			return {
				loggedOut: true,
			};
		}),
	);

	/**
	 * Validate invite token to enable invitee to set up their account.
	 *
	 * Authless endpoint.
	 */
	this.app.get(
		`/${this.restEndpoint}/resolve-signup-token`,
		ResponseHelper.send(async (req: UserRequest.ResolveSignUp) => {
			const { inviterId, inviteeId } = req.query;

			if (!inviterId || !inviteeId) {
				Logger.debug(
					'Request to resolve signup token failed because of missing user IDs in query string',
					{ inviterId, inviteeId },
				);
				throw new ResponseHelper.ResponseError('Invalid payload', undefined, 400);
			}

			const users = await Db.collections.User!.find({ where: { id: In([inviterId, inviteeId]) } });

			if (users.length !== 2) {
				Logger.debug(
					'Request to resolve signup token failed because the ID of the inviter and/or the ID of the invitee were not found in database',
					{ inviterId, inviteeId },
				);
				throw new ResponseHelper.ResponseError('Invalid invite URL', undefined, 400);
			}

			const invitee = users.find((user) => user.id === inviteeId);

			if (!invitee || invitee.password) {
				Logger.error('Invalid invite URL - invitee already setup', {
					inviterId,
					inviteeId,
				});
				throw new ResponseHelper.ResponseError('Invalid request', undefined, 400);
			}

			const inviter = users.find((user) => user.id === inviterId);

			if (!inviter || !inviter.email || !inviter.firstName) {
				Logger.error(
					'Request to resolve signup token failed because inviter does not exist or is not set up',
					{
						inviterId: inviter?.id,
					},
				);
				throw new ResponseHelper.ResponseError('Invalid request', undefined, 400);
			}

			const { firstName, lastName } = inviter;

			return { inviter: { firstName, lastName } };
		}),
	);
}
