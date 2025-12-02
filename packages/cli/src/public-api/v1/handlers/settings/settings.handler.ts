import type express from 'express';

import type { SettingsRequest } from '../../../types';
import { N8N_VERSION } from '@/constants';

export = {
	getSettings: [
		async (_req: SettingsRequest.Get, res: express.Response): Promise<express.Response> => {
			// TODO: expose version from root package.json here, rather than the one from /packages/cli/package.json
			return res.json({ version: N8N_VERSION });
		},
	],
};
