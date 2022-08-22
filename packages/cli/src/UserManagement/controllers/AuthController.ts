/* eslint-disable no-restricted-syntax */
/* eslint-disable import/no-cycle */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import type { Request, Response } from 'express';
import { In } from 'typeorm';
import validator from 'validator';
import { LoggerProxy as Logger } from 'n8n-workflow';
import { Db, InternalHooksManager, ResponseHelper } from '../..';
import { issueCookie, resolveJwt } from '../auth/jwt';
import { AUTH_COOKIE_NAME } from '../../constants';
import type { User } from '../../databases/entities/User';
import { Get, Post, RestController } from '../decorators';
import type { PublicUser } from '../Interfaces';
import type { LoginRequest, UserRequest } from '../../requests';
import { compareHash, sanitizeUser } from '../UserManagementHelper';
import * as config from '../../../config';

@RestController()
export class AuthController {
	/**
	 * Log in a user.
	 *
	 * Authless endpoint.
	 */
	@Post('/login')
	async login(req: LoginRequest, res: Response): Promise<PublicUser> {
		const { email, password } = req.body;
		if (!email) {
			throw new Error('Email is required to log in');
		}

		if (!password) {
			throw new Error('Password is required to log in');
		}

		let user: User | undefined;
		try {
			user = await Db.collections.User.findOne(
				{ email },
				{
					relations: ['globalRole'],
				},
			);
		} catch (error) {
			throw new Error('Unable to access database.');
		}

		if (!user || !user.password || !(await compareHash(password, user.password))) {
			// password is empty until user signs up
			const error = new Error('Wrong username or password. Do you have caps lock on?');
			// @ts-ignore
			error.httpStatusCode = 401;
			throw error;
		}

		await issueCookie(res, user);

		return sanitizeUser(user);
	}

	/**
	 * Manually check the `n8n-auth` cookie.
	 */
	@Get('/login')
	async loginCurrentUser(req: Request, res: Response): Promise<PublicUser> {
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
	}

	/**
	 * Validate invite token to enable invitee to set up their account.
	 *
	 * Authless endpoint.
	 */
	@Get('/resolve-signup-token')
	async resolveSignupToken(req: UserRequest.ResolveSignUp) {
		const { inviterId, inviteeId } = req.query;

		if (!inviterId || !inviteeId) {
			Logger.debug(
				'Request to resolve signup token failed because of missing user IDs in query string',
				{ inviterId, inviteeId },
			);
			throw new ResponseHelper.ResponseError('Invalid payload', undefined, 400);
		}

		// Postgres validates UUID format
		for (const userId of [inviterId, inviteeId]) {
			if (!validator.isUUID(userId)) {
				Logger.debug('Request to resolve signup token failed because of invalid user ID', {
					userId,
				});
				throw new ResponseHelper.ResponseError('Invalid userId', undefined, 400);
			}
		}

		const users = await Db.collections.User.find({ where: { id: In([inviterId, inviteeId]) } });

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
			throw new ResponseHelper.ResponseError(
				'The invitation was likely either deleted or already claimed',
				undefined,
				400,
			);
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

		void InternalHooksManager.getInstance().onUserInviteEmailClick({
			user_id: inviteeId,
		});

		const { firstName, lastName } = inviter;

		return { inviter: { firstName, lastName } };
	}

	/**
	 * Log out a user.
	 *
	 * Authless endpoint.
	 */
	@Post('/logout')
	logout(req: Request, res: Response) {
		res.clearCookie(AUTH_COOKIE_NAME);
		return { loggedOut: true };
	}
}
