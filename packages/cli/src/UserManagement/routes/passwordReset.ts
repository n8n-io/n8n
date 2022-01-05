/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable import/no-cycle */

import { v4 as uuidv4 } from 'uuid';
import { URL } from 'url';

import { Db, ResponseHelper } from '../..';
import { N8nApp } from '../Interfaces';
import { isValidEmail } from '../UserManagementHelper';
import * as UserManagementMailer from '../email';
import type { PasswordResetRequest } from '../Interfaces';

export function addPasswordResetNamespace(this: N8nApp): void {
	/**
	 * Send a password reset email.
	 */
	this.app.post(
		`/${this.restEndpoint}/forgot-password`,
		ResponseHelper.send(async (req: PasswordResetRequest.Email) => {
			const { email } = req.body;

			if (!email) {
				throw new Error('Email is mandatory');
			}

			if (!isValidEmail(email)) {
				throw new Error('Invalid email address');
			}

			if (!req.headers.host) {
				throw new Error('No host found');
			}

			const user = await Db.collections.User!.findOne({ email });

			if (!user) {
				throw new Error('Invalid email address');
			}

			user.resetPasswordToken = uuidv4();

			await Db.collections.User!.save(user);

			const { id, firstName, lastName, resetPasswordToken } = user;

			const baseUrl = `${req.protocol}://${req.headers.host}`;
			const url = new URL(`/${this.restEndpoint}/resolve-password-token`, baseUrl);
			url.searchParams.append('u', id);
			url.searchParams.append('t', resetPasswordToken);

			await UserManagementMailer.getInstance().passwordReset({
				email,
				firstName,
				lastName,
				passwordResetUrl: url.toString(),
				domain: req.headers.host,
			});
		}),
	);

	// /**
	//  * Verify password reset token and user ID.
	//  */
	// this.app.get(
	// 	`/${this.restEndpoint}/resolve-password-token`,
	// 	ResponseHelper.send(
	// 		async (req: express.Request, res: express.Response): Promise<PublicUserData> => {
	// 			// ...
	// 		},
	// 	),
	// );

	// /**
	//  * Verify password reset token and user ID and update password.
	//  */
	// this.app.post(
	// 	`/${this.restEndpoint}/change-password`,
	// 	ResponseHelper.send(async (req: PasswordResetRequest.Credentials, res: express.Response) => {
	// 		// ...
	// 	}),
	// );
}
