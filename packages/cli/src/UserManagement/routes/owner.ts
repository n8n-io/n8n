/* eslint-disable @typescript-eslint/no-non-null-assertion */
import express from 'express';
import validator from 'validator';
import { LoggerProxy as Logger } from 'n8n-workflow';

import * as Db from '@/Db';
import * as ResponseHelper from '@/ResponseHelper';
import { InternalHooksManager } from '@/InternalHooksManager';
import config from '@/config';
import { validateEntity } from '@/GenericHelpers';
import { AuthenticatedRequest, OwnerRequest } from '@/requests';
import { issueCookie } from '../auth/jwt';
import { N8nApp } from '../Interfaces';
import { hashPassword, sanitizeUser, validatePassword } from '../UserManagementHelper';

export function ownerNamespace(this: N8nApp): void {
	/**
	 * Promote a shell into the owner of the n8n instance,
	 * and enable `isInstanceOwnerSetUp` setting.
	 */
	this.app.post(
		`/${this.restEndpoint}/owner`,
		ResponseHelper.send(async (req: OwnerRequest.Post, res: express.Response) => {
			const { email, firstName, lastName, password } = req.body;
			const { id: userId } = req.user;

			if (config.getEnv('userManagement.isInstanceOwnerSetUp')) {
				Logger.debug(
					'Request to claim instance ownership failed because instance owner already exists',
					{
						userId,
					},
				);
				throw new ResponseHelper.ResponseError('Invalid request', undefined, 400);
			}

			if (!email || !validator.isEmail(email)) {
				Logger.debug('Request to claim instance ownership failed because of invalid email', {
					userId,
					invalidEmail: email,
				});
				throw new ResponseHelper.ResponseError('Invalid email address', undefined, 400);
			}

			const validPassword = validatePassword(password);

			if (!firstName || !lastName) {
				Logger.debug(
					'Request to claim instance ownership failed because of missing first name or last name in payload',
					{ userId, payload: req.body },
				);
				throw new ResponseHelper.ResponseError(
					'First and last names are mandatory',
					undefined,
					400,
				);
			}

			let owner = await Db.collections.User.findOne(userId, {
				relations: ['globalRole'],
			});

			if (!owner || (owner.globalRole.scope === 'global' && owner.globalRole.name !== 'owner')) {
				Logger.debug(
					'Request to claim instance ownership failed because user shell does not exist or has wrong role!',
					{
						userId,
					},
				);
				throw new ResponseHelper.ResponseError('Invalid request', undefined, 400);
			}

			owner = Object.assign(owner, {
				email,
				firstName,
				lastName,
				password: await hashPassword(validPassword),
			});

			await validateEntity(owner);

			owner = await Db.collections.User.save(owner);

			Logger.info('Owner was set up successfully', { userId: req.user.id });

			await Db.collections.Settings.update(
				{ key: 'userManagement.isInstanceOwnerSetUp' },
				{ value: JSON.stringify(true) },
			);

			config.set('userManagement.isInstanceOwnerSetUp', true);

			Logger.debug('Setting isInstanceOwnerSetUp updated successfully', { userId: req.user.id });

			await issueCookie(res, owner);

			void InternalHooksManager.getInstance().onInstanceOwnerSetup({
				user_id: userId,
			});

			return sanitizeUser(owner);
		}),
	);

	/**
	 * Persist that the instance owner setup has been skipped
	 */
	this.app.post(
		`/${this.restEndpoint}/owner/skip-setup`,
		// eslint-disable-next-line @typescript-eslint/naming-convention
		ResponseHelper.send(async (_req: AuthenticatedRequest, _res: express.Response) => {
			await Db.collections.Settings.update(
				{ key: 'userManagement.skipInstanceOwnerSetup' },
				{ value: JSON.stringify(true) },
			);

			config.set('userManagement.skipInstanceOwnerSetup', true);

			return { success: true };
		}),
	);
}
