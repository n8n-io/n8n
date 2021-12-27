/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable import/no-cycle */
import cookieParser = require('cookie-parser');
import * as passport from 'passport';
import { Strategy } from 'passport-jwt';
import { NextFunction, Request, Response } from 'express';
import { N8nApp, PublicUserData } from '../Interfaces';
import { addAuthenticationMethods } from './auth';
import config = require('../../../config');
import { Db, GenericHelpers, ResponseHelper } from '../..';
import { User } from '../../databases/entities/User';
import { getInstance } from '../email/UserManagementMailer';
import { isEmailSetup } from '../UserManagementHelper';

export async function addRoutes(this: N8nApp, ignoredEndpoints: string[]): Promise<void> {
	this.app.use(cookieParser());

	console.log('something is happening');
	console.log(ignoredEndpoints);

	const options = {
		jwtFromRequest: (req: Request) => {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			return (req.cookies?.['n8n-auth'] as string | undefined) ?? null;
		},
		secretOrKey: config.get('userManagement.jwtSecret') as string,
	};

	passport.use(
		new Strategy(options, async function (jwtPayload: PublicUserData, done) {
			// We will assign the `sub` property on the JWT to the database ID of user
			const user = await Db.collections.User!.findOne(
				{
					id: jwtPayload.id,
				},
				{ relations: ['globalRole'] },
			);
			// console.log(user);
			if (
				!user ||
				(user.password && !user.password.includes(jwtPayload.password!)) ||
				(user.email && user.email !== jwtPayload.email)
			) {
				// If user has email or password in database, we check.
				// When owner hasn't been set up, the default user
				// won't have email nor password.
				return done(null, false, { message: 'User not found' });
			}
			return done(null, user);
		}),
	);

	this.app.use(passport.initialize());

	this.app.use((req: Request, res: Response, next: NextFunction) => {
		// console.log(req.url);
		// just temp for development
		if (
			req.url.includes('login') ||
			req.url === '/index.html' ||
			req.url.startsWith('/css/') ||
			req.url.startsWith('/js/') ||
			req.url.startsWith('/fonts/') ||
			req.url.startsWith('/rest/settings')
		) {
			// console.log('skip auth because of first block');
			return next();
		}

		for (let i = 0; i < ignoredEndpoints.length; i++) {
			const path = ignoredEndpoints[i];
			if (!path) {
				// Skip empty paths (they might exist)
				// eslint-disable-next-line no-continue
				continue;
			}
			if (req.url.includes(path)) {
				// console.log('skip auth because of path ', path);
				return next();
			}
		}
		// console.log('should authenticate route ', req.url);
		return passport.authenticate('jwt', { session: false })(req, res, next);
	});

	addAuthenticationMethods.apply(this);

	// ----------------------------------------
	// Temporary code below - must be refactored
	// and moved from here.
	// ----------------------------------------

	// ----------------------------------------
	// Create instance owner
	// ----------------------------------------

	this.app.post(
		`/${this.restEndpoint}/owner-setup`,
		ResponseHelper.send(async (req: Request, res: Response) => {
			const role = await Db.collections.Role!.findOne({ name: 'owner', scope: 'global' });
			const owner = await Db.collections.User!.save({
				email: 'ben@n8n.io',
				firstName: 'Ben',
				lastName: 'Hesseldieck',
				password: 'abc',
				globalRole: role,
			});
			return owner;
		}),
	);

	this.app.get(`/${this.restEndpoint}/user/:id`, async (req: Request, res: Response) => {
		const user = await Db.collections.User!.findOne({ id: req.params.id });
		if (user) {
			ResponseHelper.sendSuccessResponse(res, user);
		}
		// adjust helper that you can pass statuscode, in this case 404!
		ResponseHelper.sendErrorResponse(res, new Error('User not found!'));
	});

	this.app.post(
		`/${this.restEndpoint}/invite`,
		ResponseHelper.send(async (req: Request, res: Response) => {
			// TODO UM: validate if current user can invite people.

			if (!isEmailSetup()) {
				throw new Error('Email sending must be set up in order to invite other users.');
			}

			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-non-null-assertion
			const role = await Db.collections.Role!.findOne(req.body.roleId);

			if (!role) {
				throw new Error('Selected role was not found');
			}

			const { email, firstName, lastName } = req.body as {
				email: string;
				firstName?: string;
				lastName?: string;
			};

			if (!email.includes('@') || !email.includes('.')) {
				throw new Error('You must provide a valid email address');
			}

			// TODO UM: when using workspaces this needs to be very differernt.
			const emailExists = await Db.collections.User!.findOne({ email });

			if (emailExists) {
				ResponseHelper.sendErrorResponse(res, new Error('Email already exists'));
				return;
			}

			const userInfo = {
				email,
				firstName,
				lastName,
				globalRole: role,
			} as User;

			const newUser = await Db.collections.User!.save(userInfo);

			let inviteAcceptUrl = GenericHelpers.getBaseUrl();
			const domain = inviteAcceptUrl;
			if (!inviteAcceptUrl.endsWith('/')) {
				inviteAcceptUrl += '/';
			}
			// TODO UM: decide if this URL will be final.
			// TODO UM: user id below needs to be changed
			// eslint-disable-next-line @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unsafe-member-access
			inviteAcceptUrl += `accept-invite/${req.body.userId}/${newUser.id}`;

			const mailer = getInstance();
			const result = await mailer.invite({
				email,
				firstName,
				lastName,
				inviteAcceptUrl,
				domain,
			});

			if (result.success) {
				ResponseHelper.sendSuccessResponse(res, { success: true });
			} else {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				ResponseHelper.sendErrorResponse(res, result.error!);
			}
		}),
	);
}
