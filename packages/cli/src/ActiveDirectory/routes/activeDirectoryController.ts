/* eslint-disable import/no-cycle */
import express from 'express';
import { ResponseHelper } from '../..';
import { getActiveDirectoryConfig } from '../helpers';
import { ActiveDirectoryConfig } from '../types';

export const activeDirectoryController = express.Router();

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
