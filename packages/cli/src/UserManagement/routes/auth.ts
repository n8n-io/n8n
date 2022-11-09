/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Request, Response } from 'express';
import { IDataObject } from 'n8n-workflow';
import * as Db from '@/Db';
import * as ResponseHelper from '@/ResponseHelper';
import { AUTH_COOKIE_NAME } from '@/constants';
import { issueCookie, resolveJwt } from '../auth/jwt';
import { N8nApp, PublicUser } from '../Interfaces';
import { sanitizeUser } from '../UserManagementHelper';
import { User } from '@db/entities/User';
import type { LoginRequest } from '@/requests';
import config from '@/config';
import { handleEmailLogin, handleLdapLogin } from '@/UserAuthentication';

export function authenticationMethods(this: N8nApp): void {
	/**
	 * Log in a user.
	 *
	 * Authless endpoint.
	 */
	this.app.post(
		`/${this.restEndpoint}/login`,
		ResponseHelper.send(async (req: LoginRequest, res: Response): Promise<PublicUser> => {
			const { email, password } = req.body;

			if (!email) {
				throw new Error('Email is required to log in');
			}

			if (!password) {
				throw new Error('Password is required to log in');
			}

			const adUser = await handleLdapLogin(email, password);

			if (adUser) {
				await issueCookie(res, adUser);

				return sanitizeUser(adUser);
			}

			const localUser = await handleEmailLogin(email, password);

			if (localUser) {
				await issueCookie(res, localUser);

				return sanitizeUser(localUser);
			}

			const error = new Error('Wrong username or password. Do you have caps lock on?');
			// @ts-ignore
			error.httpStatusCode = 401;
			throw error;
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

					// currently only LDAP users during syncronization
					// can be set to disabled
					if (user.disabled === true) {
						res.clearCookie(AUTH_COOKIE_NAME);
						const error = new Error('User disabled cannot log in');
						// @ts-ignore
						error.httpStatusCode = 401;
						throw error;
					}

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
}
