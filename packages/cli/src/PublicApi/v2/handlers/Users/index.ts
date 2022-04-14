/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unused-vars */
import express = require('express');

import { UserRequest } from '../../../../requests';

import { getUser } from '../../../helpers';

import { ResponseHelper } from '../../../..';

import { middlewares } from '../../../middlewares';

export = {
	getUser: [
		...middlewares.getUser,
		// @ts-ignore
		ResponseHelper.send(async (req: UserRequest.Get, res: express.Response) => {
			const { includeRole = false } = req.query;
			const { identifier } = req.params;

			const user = await getUser({ withIdentifier: identifier, includeRole });

			if (!user) {
				throw new ResponseHelper.ResponseError(
					`Could not find user with identifier: ${identifier}`,
					undefined,
					404,
				);
			}

			return user;
		}, true),
	],
};
