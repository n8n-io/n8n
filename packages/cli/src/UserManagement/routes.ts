import * as express from 'express';
import { Db, ResponseHelper } from '..';
import { User } from '../databases/entities/User';
import { getInstance } from './email';

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

	this.app.get(
		`/${this.restEndpoint}/test-email`,
		async (req: express.Request, res: express.Response) => {
			const mailer = getInstance();
			const result = await mailer.sendInstanceSetupEmail({
				email: 'omar@n8n.io',
				firstName: 'Omar',
				lastName: 'Ajoue',
			});
			if (result.success) {
				ResponseHelper.sendSuccessResponse(res, 'All good!');
			} else {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				ResponseHelper.sendErrorResponse(res, result.error!);
			}
		},
	);
}
