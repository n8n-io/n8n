/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable import/no-cycle */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Request, Response } from 'express';
import passport from 'passport';
import { IDataObject, LoggerProxy as Logger } from 'n8n-workflow';
import { Db, ResponseHelper, InternalHooksManager } from '../..';
import { AUTH_COOKIE_NAME } from '../../constants';
import { issueCookie, resolveJwt } from '../auth/jwt';
import { N8nApp, PublicUser } from '../Interfaces';
import { compareHash, sanitizeUser } from '../UserManagementHelper';
import { User } from '../../databases/entities/User';
import type { LoginRequest } from '../../requests';
import config = require('../../../config');
import { entities } from '../../databases/entities';

export function authenticationMethods(this: N8nApp): void {
	/**
	 * Log in a user.
	 *
	 * Authless endpoint.
	 */
	this.app.post(
		`/${this.restEndpoint}/login`,
		ResponseHelper.send(async (req: LoginRequest, res: Response): Promise<PublicUser> => {
			if (!req.body.email) {
				throw new Error('Email is required to log in');
			}

			if (!req.body.password) {
				throw new Error('Password is required to log in');
			}

			let user;
			try {
				user = await Db.collections.User.findOne(
					{
						email: req.body.email,
					},
					{
						relations: ['globalRole'],
					},
				);
			} catch (error) {
				throw new Error('Unable to access database.');
			}

			if (!user || !user.password || !(await compareHash(req.body.password, user.password))) {
				// password is empty until user signs up
				const error = new Error('Wrong username or password. Do you have caps lock on?');
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

					if (!config.get('userManagement.isInstanceOwnerSetUp')) {
						res.cookie(AUTH_COOKIE_NAME, cookieContents);
					}

					return sanitizeUser(user);
				} catch (error) {
					res.clearCookie(AUTH_COOKIE_NAME);
				}
			}

			if (config.get('userManagement.isInstanceOwnerSetUp')) {
				const error = new Error('Not logged in');
				// @ts-ignore
				error.httpStatusCode = 401;
				throw error;
			}

			try {
				user = await Db.collections.User.findOneOrFail({ relations: ['globalRole'] });
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
		ResponseHelper.send(async (_, res: Response): Promise<IDataObject> => {
			res.clearCookie(AUTH_COOKIE_NAME);
			return {
				loggedOut: true,
			};
		}),
	);

	/**
	 * Initialize sso.
	 *
	 * Authless endpoint.
	 */
	this.app.get(
		`/${this.restEndpoint}/login/saml`,
		passport.authenticate('saml', {
			failureRedirect: `/${this.restEndpoint}/login/saml`,
			failureFlash: true,
			session: false,
		}),
	);

	/**
	 * Sso callback.
	 *
	 * Authless endpoint.
	 */
	this.app.post(`/${this.restEndpoint}/login/saml/callback`,
		passport.authenticate('saml', {
			failureRedirect: `/${this.restEndpoint}/login/saml`,
			failureFlash: true,
			session: false,
		}),
		async (req, res) => {
			if (!req.isAuthenticated() || !req.user) throw Error('Authentication failed');
			const samlUser = req.user as {
				nameID: string;
				firstName?: string;
				lastName?: string;
			};

			let user;
			try {
				user = await Db.collections.User.findOne(
					{
						email: samlUser.nameID,
					},
					{
						relations: ['globalRole'],
					},
				);
			} catch (error) {
				throw new Error('Unable to access database.');
			}

			if (!user) {
				const role = await Db.collections.Role.findOne({ scope: 'global', name: 'member' });
				if (!role) {
					Logger.error(
						'Request to send email invite(s) to user(s) failed because no global member role was found in database',
					);
					throw new ResponseHelper.ResponseError(
						'Members role not found in database - inconsistent state',
						undefined,
						500,
					);
				}

				const newUser = new User();
				newUser.email = samlUser.nameID;
				newUser.isPending = false;
				newUser.globalRole = role;
				if (samlUser.firstName) {
					newUser.firstName = samlUser.firstName;
				}
				if (samlUser.lastName) {
					newUser.lastName = samlUser.lastName;
				}

				const userRepository = Db.linkRepository(entities.User);
				user = userRepository.create(newUser);
				await userRepository.save(user);

				void InternalHooksManager.getInstance().onUserSignup({
					user_id: user.id,
				});
			}

			if (!user) throw new Error('User undefined');

			await issueCookie(res, user);

			res.redirect(302, '/');
		},
	);
}
