/* eslint-disable import/no-cycle */
import express from 'express';
import { ActiveDirectoryManager } from '../ActiveDirectoryManager';
import {
	getActiveDirectoryConfig,
	listADSyncronizations,
	updateActiveDirectoryConfig,
} from '../helpers';
import type { ActiveDirectoryConfig } from '../types';

export const activeDirectoryController = express.Router();

/**
 * GET /active-directory/config
 */
activeDirectoryController.get('/config', async (req: express.Request, res: express.Response) => {
	const { data } = await getActiveDirectoryConfig();
	return res.status(200).json({ data });
});
/**
 * POST /active-directory/test-connection
 */
activeDirectoryController.post(
	'/test-connection',
	async (req: express.Request, res: express.Response) => {
		try {
			await ActiveDirectoryManager.getInstance().service.testConnection();
		} catch (error) {
			const errorObject = error as { message: string };
			return res.status(400).json({ message: errorObject.message });
		}
		return res.status(200).json();
	},
);

/**
 * PUT /active-directory/config
 */
activeDirectoryController.put(
	'/config',
	async (req: ActiveDirectoryConfig.Update, res: express.Response) => {
		await updateActiveDirectoryConfig(req.body);

		const { data } = await getActiveDirectoryConfig();

		ActiveDirectoryManager.config(data);

		return res.status(200).json(data);
	},
);

/**
 * POST /active-directory/sync
 */
activeDirectoryController.post(
	'/sync',
	async (req: ActiveDirectoryConfig.Sync, res: express.Response) => {
		const runType = req.body.type;

		await ActiveDirectoryManager.getInstance().sync.run(runType);

		return res.status(200).json({});
	},
);

/**
 * GET /active-directory/sync
 */
activeDirectoryController.get('/sync', async (req: express.Request, res: express.Response) => {
	const data = await listADSyncronizations();
	return res.status(200).json({ data });
});
