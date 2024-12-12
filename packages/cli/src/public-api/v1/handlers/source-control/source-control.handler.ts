import type express from 'express';
import type { StatusResult } from 'simple-git';
import { Container } from 'typedi';

import {
	getTrackingInformationFromPullResult,
	isSourceControlLicensed,
} from '@/environments/source-control/source-control-helper.ee';
import { SourceControlPreferencesService } from '@/environments/source-control/source-control-preferences.service.ee';
import { SourceControlService } from '@/environments/source-control/source-control.service.ee';
import type { ImportResult } from '@/environments/source-control/types/import-result';
import { EventService } from '@/events/event.service';

import type { PublicSourceControlRequest } from '../../../types';
import { globalScope } from '../../shared/middlewares/global.middleware';

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
				const result = await sourceControlService.pullWorkfolder(req.user, {
					force: req.body.force,
					variables: req.body.variables,
					userId: req.user.id,
				});

				if (result.statusCode === 200) {
					Container.get(EventService).emit('source-control-user-pulled-api', {
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
