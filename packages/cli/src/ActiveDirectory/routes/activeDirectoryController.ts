/* eslint-disable import/no-cycle */
import express from 'express';
import { ResponseHelper } from '../..';
import { AuthenticatedRequest } from '../../requests';
import { getActiveDirectoryConfig } from '../helpers';
import { ActiveDirectoryConfig } from '../types';

export const activeDirectoryController = express.Router();

activeDirectoryController.use((req: AuthenticatedRequest, res, next) => {
	console.log(req.body);

	if (req.user.globalRole.name !== 'owner') {
		return res.status(403).json({
			message: 'Unauthorized',
		});
	}
	return next();
});

/**
 * GET /active-directory/config
 */
activeDirectoryController.get(
	'/config',
	ResponseHelper.send(async (): Promise<ActiveDirectoryConfig> => {
		const { data } = await getActiveDirectoryConfig();
		return data;
	}),
);
