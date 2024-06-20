import type express from 'express';
import { Container } from 'typedi';
import type { StatusResult } from 'simple-git';
import type { PublicSourceControlRequest } from '../../../types';
import { globalScope } from '../../shared/middlewares/global.middleware';
import type { ImportResult } from '@/environments/sourceControl/types/importResult';
import { SourceControlService } from '@/environments/sourceControl/sourceControl.service.ee';
import { SourceControlPreferencesService } from '@/environments/sourceControl/sourceControlPreferences.service.ee';
import {
	getTrackingInformationFromPullResult,
	isSourceControlLicensed,
} from '@/environments/sourceControl/sourceControlHelper.ee';
import { InternalHooks } from '@/InternalHooks';

export = {
	pull: [
		globalScope('sourceControl:pull'),
		async (
			req: PublicSourceControlRequest.Pull,
			res: express.Response,
		): Promise<ImportResult | StatusResult | Promise<express.Response>> => {
			const sourceControlPreferencesService = Container.get(SourceControlPreferencesService);
			if (!isSourceControlLicensed()) {
				return res
					.status(401)
					.json({ status: 'Error', message: 'Source Control feature is not licensed' });
			}
			if (!sourceControlPreferencesService.isSourceControlConnected()) {
				return res
					.status(400)
					.json({ status: 'Error', message: 'Source Control is not connected to a repository' });
			}
			try {
				const sourceControlService = Container.get(SourceControlService);
				const result = await sourceControlService.pullWorkfolder({
					force: req.body.force,
					variables: req.body.variables,
					userId: req.user.id,
				});

				if (result.statusCode === 200) {
					void Container.get(InternalHooks).onSourceControlUserPulledAPI({
						...getTrackingInformationFromPullResult(result.statusResult),
						forced: req.body.force ?? false,
					});
					return res.status(200).send(result.statusResult);
				} else {
					return res.status(409).send(result.statusResult);
				}
			} catch (error) {
				return res.status(400).send((error as { message: string }).message);
			}
		},
	],
};
