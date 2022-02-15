/* eslint-disable import/no-cycle */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { hashSync, genSaltSync } from 'bcryptjs';
import * as express from 'express';
import validator from 'validator';

import { Db, ResponseHelper } from '../..';
import config = require('../../../config');
import { User } from '../../databases/entities/User';
import { validateEntity } from '../../GenericHelpers';
import { OwnerRequest } from '../../requests';
import { issueCookie } from '../auth/jwt';
import { N8nApp } from '../Interfaces';
import { sanitizeUser, validatePassword } from '../UserManagementHelper';

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
				throw new ResponseHelper.ResponseError('Invalid request', undefined, 400);
			}

			if (!email || !validator.isEmail(email)) {
				throw new ResponseHelper.ResponseError('Invalid email address', undefined, 400);
			}

			const validPassword = validatePassword(password);

			if (!firstName || !lastName) {
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
				password: hashSync(validPassword, genSaltSync(10)),
				globalRole,
				id: userId,
			});

			await validateEntity(newUser);

			const owner = await Db.collections.User!.save(newUser);

			config.set('userManagement.hasOwner', true);

			await Db.collections.Settings!.update(
				{ key: 'userManagement.hasOwner' },
				{ value: JSON.stringify(true) },
			);

			await issueCookie(res, owner);

			return sanitizeUser(owner);
		}),
	);
}
