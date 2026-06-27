import { PullWorkFolderRequestDto, PushWorkFolderRequestDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Container } from '@n8n/di';

import { EventService } from '@/events/event.service';
import {
	getTrackingInformationFromPostPushResult,
	getTrackingInformationFromPullResult,
	isSourceControlLicensed,
} from '@/modules/source-control.ee/source-control-helper.ee';
import { SourceControlPreferencesService } from '@/modules/source-control.ee/source-control-preferences.service.ee';
import { SourceControlService } from '@/modules/source-control.ee/source-control.service.ee';

import type { PublicAPIEndpoint } from '../../shared/handler.types';
import { apiKeyHasScopeWithGlobalScopeFallback } from '../../shared/middlewares/global.middleware';

type SourceControlHandlers = {
	pull: PublicAPIEndpoint<AuthenticatedRequest>;
	push: PublicAPIEndpoint<AuthenticatedRequest>;
};

const sourceControlHandlers: SourceControlHandlers = {
	pull: [
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'sourceControl:pull' }),
		async (req, res) => {
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
		async (req, res) => {
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
				const payload = PushWorkFolderRequestDto.parse({
					force: req.body?.force,
					commitMessage: req.body?.commitMessage,
					fileNames: req.body?.fileNames ?? [],
				});
				const sourceControlService = Container.get(SourceControlService);
				await sourceControlService.setGitUserDetails(
					`${req.user.firstName} ${req.user.lastName}`,
					req.user.email,
				);
				const result = await sourceControlService.pushWorkfolder(req.user, payload);
				const commit = result.pushResult?.update?.hash?.to
					? {
							hash: result.pushResult.update.hash.to,
							message: payload.commitMessage ?? 'Updated Workfolder',
							branch: result.pushResult.update.head?.local ?? '',
						}
					: null;
				if (result.statusCode === 200) {
					Container.get(EventService).emit('source-control-user-pushed-api', {
						...getTrackingInformationFromPostPushResult(req.user.id, result.statusResult),
						forced: payload.force ?? false,
					});
				}
				return res.status(result.statusCode).json({ files: result.statusResult, commit });
			} catch (error) {
				return res.status(400).send((error as { message: string }).message);
			}
		},
	],
};

export = sourceControlHandlers;
