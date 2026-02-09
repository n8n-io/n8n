import { PullWorkFolderRequestDto, PushWorkFolderRequestDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Container } from '@n8n/di';
import type express from 'express';
import type { StatusResult } from 'simple-git';

import {
	getTrackingInformationFromPostPushResult,
	getTrackingInformationFromPullResult,
	isSourceControlLicensed,
} from '@/modules/source-control.ee/source-control-helper.ee';
import { SourceControlPreferencesService } from '@/modules/source-control.ee/source-control-preferences.service.ee';
import { SourceControlService } from '@/modules/source-control.ee/source-control.service.ee';
import type { ImportResult } from '@/modules/source-control.ee/types/import-result';
import { SourceControlGetStatus } from '@/modules/source-control.ee/types/source-control-get-status';
import { EventService } from '@/events/event.service';

import { apiKeyHasScopeWithGlobalScopeFallback } from '../../shared/middlewares/global.middleware';

export = {
	pull: [
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'sourceControl:pull' }),
		async (
			req: AuthenticatedRequest,
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
				const payload = PullWorkFolderRequestDto.parse(req.body);
				const sourceControlService = Container.get(SourceControlService);
				const result = await sourceControlService.pullWorkfolder(req.user, payload);

				if (result.statusCode === 200) {
					Container.get(EventService).emit('source-control-user-pulled-api', {
						...getTrackingInformationFromPullResult(req.user.id, result.statusResult),
						forced: payload.force ?? false,
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

	push: [
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'sourceControl:push' }),
		async (req: AuthenticatedRequest, res: express.Response): Promise<express.Response> => {
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
				const payload = PushWorkFolderRequestDto.parse(req.body);
				const sourceControlService = Container.get(SourceControlService);

				await sourceControlService.setGitUserDetails(
					`${req.user.firstName} ${req.user.lastName}`,
					req.user.email,
				);

				const result = await sourceControlService.pushWorkfolder(req.user, payload);

				if (result.statusCode === 200) {
					Container.get(EventService).emit(
						'source-control-user-finished-push-ui',
						getTrackingInformationFromPostPushResult(req.user.id, result.statusResult),
					);
					return res.status(200).json({
						files: result.statusResult,
						commit: result.pushResult?.update?.hash?.to
							? {
									hash: result.pushResult.update.hash.to,
									message: payload.commitMessage ?? 'Updated Workfolder',
									branch: result.pushResult.update.head?.local ?? '',
								}
							: null,
					});
				} else {
					return res.status(409).json({ files: result.statusResult, commit: null });
				}
			} catch (error) {
				return res.status(400).send((error as { message: string }).message);
			}
		},
	],

	getStatus: [
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'sourceControl:pull' }),
		async (req: AuthenticatedRequest, res: express.Response): Promise<express.Response> => {
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
				const query = req.query as Record<string, string>;
				const result = await sourceControlService.getStatus(
					req.user,
					new SourceControlGetStatus({
						direction: (query.direction as 'push' | 'pull') ?? 'push',
						verbose: query.verbose ?? 'false',
						preferLocalVersion: query.preferLocalVersion ?? 'true',
					}),
				);
				return res.status(200).json(result);
			} catch (error) {
				return res.status(400).send((error as { message: string }).message);
			}
		},
	],
};
