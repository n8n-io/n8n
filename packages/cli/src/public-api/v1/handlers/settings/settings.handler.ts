import type express from 'express';

import type { SettingsRequest } from '../../../types';
import { N8N_ROOT_VERSION } from '@/constants';

export = {
	getSettings: [
		async (_req: SettingsRequest.Get, res: express.Response): Promise<express.Response> => {
			const data = { version: N8N_ROOT_VERSION };

			return res.json({ data });
		},
	],
};
