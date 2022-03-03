/* eslint-disable import/no-cycle */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { hashSync, genSaltSync } from 'bcryptjs';
import * as express from 'express';
import validator from 'validator';
import { LoggerProxy as Logger } from 'n8n-workflow';

import config = require('../../../config');
import { validateEntity } from '../../GenericHelpers';
import { AuthenticatedRequest, OwnerRequest } from '../../requests';
import { issueCookie } from '../auth/jwt';
import { sanitizeUser, validatePassword } from '../UserManagementHelper';
import { ResponseError, send } from '../../ResponseHelper';
import { collections } from '../../Db';

export const ownerController = express.Router();

ownerController.post(
	'/owner',
	send(async (req: OwnerRequest.Post, res: express.Response) => {
		const { email, firstName, lastName, password } = req.body;
		const { id: userId } = req.user;

		if (config.get('userManagement.isInstanceOwnerSetUp')) {
			Logger.debug(
				'Request to claim instance ownership failed because instance owner already exists',
				{
					userId,
				},
			);
			throw new ResponseError('Invalid request', undefined, 400);
		}

		if (!email || !validator.isEmail(email)) {
			Logger.debug('Request to claim instance ownership failed because of invalid email', {
				userId,
				invalidEmail: email,
			});
			throw new ResponseError('Invalid email address', undefined, 400);
		}

		const validPassword = validatePassword(password);

		if (!firstName || !lastName) {
			Logger.debug(
				'Request to claim instance ownership failed because of missing first name or last name in payload',
				{ userId, payload: req.body },
			);
			throw new ResponseError('First and last names are mandatory', undefined, 400);
		}

		let owner = await collections.User!.findOne(userId, {
			relations: ['globalRole'],
		});

		if (!owner || (owner.globalRole.scope === 'global' && owner.globalRole.name !== 'owner')) {
			Logger.debug(
				'Request to claim instance ownership failed because user shell does not exist or has wrong role!',
				{
					userId,
				},
			);
			throw new ResponseError('Invalid request', undefined, 400);
		}

		owner = Object.assign(owner, {
			email,
			firstName,
			lastName,
			password: hashSync(validPassword, genSaltSync(10)),
		});

		await validateEntity(owner);

		owner = await collections.User!.save(owner);

		Logger.info('Owner was set up successfully', { userId: req.user.id });

		await collections.Settings!.update(
			{ key: 'userManagement.isInstanceOwnerSetUp' },
			{ value: JSON.stringify(true) },
		);

		config.set('userManagement.isInstanceOwnerSetUp', true);

		Logger.debug('Setting isInstanceOwnerSetUp updated successfully', { userId: req.user.id });

		await issueCookie(res, owner);

		return sanitizeUser(owner);
	}),
);

/**
 * Persist that the instance owner setup has been skipped
 */
ownerController.post(
	'/owner/skip-setup',
	// eslint-disable-next-line @typescript-eslint/naming-convention
	send(async (_req: AuthenticatedRequest, _res: express.Response) => {
		await collections.Settings!.update(
			{ key: 'userManagement.skipInstanceOwnerSetup' },
			{ value: JSON.stringify(true) },
		);

		config.set('userManagement.skipInstanceOwnerSetup', true);

		return { success: true };
	}),
);
