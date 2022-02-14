/* eslint-disable import/no-cycle */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { hashSync, genSaltSync } from 'bcryptjs';
import * as express from 'express';
import validator from 'validator';
import { LoggerProxy } from 'n8n-workflow';

import { Db, ResponseHelper } from '../..';
import config = require('../../../config');
import { User } from '../../databases/entities/User';
import { validateEntity } from '../../GenericHelpers';
import { OwnerRequest } from '../../requests';
import { issueCookie } from '../auth/jwt';
import { N8nApp } from '../Interfaces';
import { sanitizeUser } from '../UserManagementHelper';
import { getLogger } from '../../Logger';

LoggerProxy.init(getLogger());

export function ownerNamespace(this: N8nApp): void {
	/**
	 * Promote a shell into the owner of the n8n instance,
	 * and enable `hasOwner` instance setting.
	 */
	this.app.post(
		`/${this.restEndpoint}/owner`,
		ResponseHelper.send(async (req: OwnerRequest.Post, res: express.Response) => {
			const { email, firstName, lastName, password } = req.body;
			const { id: userId } = req.user;

			if (config.get('userManagement.hasOwner')) {
				LoggerProxy.error('Attempted to create owner when owner already exists at POST /owner', {
					userId,
				});
				throw new ResponseHelper.ResponseError('Invalid request', undefined, 400);
			}

			if (!email || !validator.isEmail(email)) {
				LoggerProxy.error('Invalid email in payload at POST /owner', {
					userId,
					email,
				});
				throw new ResponseHelper.ResponseError('Invalid email address', undefined, 400);
			}

			if (!password) {
				LoggerProxy.error('Empty password in payload at POST /owner', { userId });
				throw new ResponseHelper.ResponseError(
					'Password does not comply to security standards',
					undefined,
					400,
				);
			}

			if (!firstName || !lastName) {
				LoggerProxy.error('Missing firstName or lastName in payload at POST /owner', {
					firstName,
					lastName,
				});
				throw new ResponseHelper.ResponseError(
					'First and last names are mandatory',
					undefined,
					400,
				);
			}

			const globalRole = await Db.collections.Role!.findOneOrFail({
				name: 'owner',
				scope: 'global',
			});

			const newUser = new User();

			Object.assign(newUser, {
				email,
				firstName,
				lastName,
				password: hashSync(password, genSaltSync(10)),
				globalRole,
				id: userId,
			});

			await validateEntity(newUser);

			const owner = await Db.collections.User!.save(newUser);

			LoggerProxy.debug('Owner saved successfully at POST /owner', { userId: req.user.id });

			config.set('userManagement.hasOwner', true);

			await Db.collections.Settings!.update(
				{ key: 'userManagement.hasOwner' },
				{ value: JSON.stringify(true) },
			);

			LoggerProxy.debug('Setting hasOwner updated successfully at POST /owner', { hasOwner: true });

			await issueCookie(res, owner);

			return sanitizeUser(owner);
		}),
	);
}
