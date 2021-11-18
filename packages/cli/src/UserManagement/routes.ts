/* eslint-disable import/no-cycle */
import * as express from 'express';
import { Db, GenericHelpers, ResponseHelper } from '..';
import { User } from '../databases/entities/User';
import { getInstance } from './email';
import { isEmailSetup } from './UserManagementHelper';

export function addRoutes(): void {
	// ----------------------------------------
	// Create instance owner
	// ----------------------------------------

	this.app.post(
		`/${this.restEndpoint}/owner-setup`,
		ResponseHelper.send(async (req: express.Request, res: express.Response) => {
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

	this.app.get(
		`/${this.restEndpoint}/user/:id`,
		async (req: express.Request, res: express.Response) => {
			const user = await Db.collections.User!.findOne({ id: req.params.id });
			if (user) {
				ResponseHelper.sendSuccessResponse(res, user);
			}
			// adjust helper that you can pass statuscode, in this case 404!
			ResponseHelper.sendErrorResponse(res, new Error('User not found!'));
		},
	);

	this.app.post(
		`/${this.restEndpoint}/invite`,
		async (req: express.Request, res: express.Response) => {
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
		},
	);
}
