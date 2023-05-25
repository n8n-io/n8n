import type express from 'express';
import type { StatusResult } from 'simple-git';
import type { PublicVersionControlRequest } from '../../../types';
import { authorize } from '../../shared/middlewares/global.middleware';
import type { ImportResult } from '@/environments/versionControl/types/importResult';
import Container from 'typedi';
import { VersionControlService } from '@/environments/versionControl/versionControl.service.ee';
import { VersionControlPreferencesService } from '@/environments/versionControl/versionControlPreferences.service.ee';

export = {
	pull: [
		authorize(['owner', 'member']),
		async (
			req: PublicVersionControlRequest.Pull,
			res: express.Response,
		): Promise<ImportResult | StatusResult | Promise<express.Response>> => {
			const versionControlPreferencesService = Container.get(VersionControlPreferencesService);
			if (!versionControlPreferencesService.isVersionControlLicensedAndEnabled()) {
				return res.status(401).json({ status: 'error', message: 'Endpoint unavailable' });
			}
			try {
				const versionControlService = Container.get(VersionControlService);
				const result = await versionControlService.pullWorkfolder({
					force: req.body.force,
					variables: req.body.variables,
					userId: req.user.id,
					importAfterPull: true,
				});
				if ((result as ImportResult)?.workflows) {
					return res.status(200).send(result as ImportResult);
				} else {
					return res.status(409).send(result);
				}
			} catch (error) {
				return res.status(400).send((error as { message: string }).message);
			}
		},
	],
};
