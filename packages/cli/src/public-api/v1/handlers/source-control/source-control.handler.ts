import { PullWorkFolderRequestDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Container } from '@n8n/di';
import type express from 'express';
import type { StatusResult } from 'simple-git';

import {
	getTrackingInformationFromPullResult,
	isSourceControlLicensed,
} from '@/environments.ee/source-control/source-control-helper.ee';
import { SourceControlPreferencesService } from '@/environments.ee/source-control/source-control-preferences.service.ee';
import { SourceControlService } from '@/environments.ee/source-control/source-control.service.ee';
import type { ImportResult } from '@/environments.ee/source-control/types/import-result';
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
	getCommitHistory: [
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'sourceControl:read' }),
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
				const limit = parseInt(req.query.limit as string) || 10;
				const offset = parseInt(req.query.offset as string) || 0;

				const commits = await sourceControlService.getCommitHistory({ limit, offset });
				return res.status(200).json({ commits });
			} catch (error) {
				return res.status(400).json({
					status: 'Error',
					message: (error as { message: string }).message,
				});
			}
		},
	],
	getRepositoryStatus: [
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'sourceControl:read' }),
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
				const status = await sourceControlService.getStatus();
				return res.status(200).json(status);
			} catch (error) {
				return res.status(400).json({
					status: 'Error',
					message: (error as { message: string }).message,
				});
			}
		},
	],
	syncCheck: [
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'sourceControl:read' }),
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
				const syncStatus = await sourceControlService.getBranches();
				return res.status(200).json(syncStatus);
			} catch (error) {
				return res.status(400).json({
					status: 'Error',
					message: (error as { message: string }).message,
				});
			}
		},
	],
	setBranch: [
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'sourceControl:manage' }),
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
				const branchName = req.body.branch;
				if (!branchName) {
					return res.status(400).json({
						status: 'Error',
						message: 'Branch name is required',
					});
				}
				await sourceControlService.setBranch(branchName);
				return res.status(200).json({ status: 'success', branch: branchName });
			} catch (error) {
				return res.status(400).json({
					status: 'Error',
					message: (error as { message: string }).message,
				});
			}
		},
	],
};
