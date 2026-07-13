import { PullWorkFolderRequestDto, PushWorkFolderRequestDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Container } from '@n8n/di';
import type { ApiKeyScope } from '@n8n/permissions';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { EventService } from '@/events/event.service';
import {
	getTrackingInformationFromPostPushResult,
	getTrackingInformationFromPullResult,
	isSourceControlLicensed,
} from '@/modules/source-control.ee/source-control-helper.ee';
import { SourceControlPreferencesService } from '@/modules/source-control.ee/source-control-preferences.service.ee';
import { SourceControlScopedService } from '@/modules/source-control.ee/source-control-scoped.service';
import { SourceControlService } from '@/modules/source-control.ee/source-control.service.ee';
import { SourceControlGetStatus } from '@/modules/source-control.ee/types/source-control-get-status';

import type { PublicAPIEndpoint } from '../../shared/handler.types';
import {
	apiKeyHasScopeWithGlobalScopeFallback,
	publicApiCompositeScope,
} from '../../shared/middlewares/global.middleware';

type SourceControlHandlers = {
	pull: PublicAPIEndpoint<AuthenticatedRequest>;
	push: PublicAPIEndpoint<AuthenticatedRequest>;
	status: PublicAPIEndpoint<AuthenticatedRequest>;
};

// A status preview requires the scope for the direction it plans: reading a
// push diff needs push, reading a pull diff needs pull. Enforced in-handler
// because the required scope depends on the request's `direction`.
const STATUS_SCOPES = 'sourceControl:pull,sourceControl:push';

function assertStatusApiKeyScope(req: AuthenticatedRequest, direction: 'push' | 'pull') {
	const apiKeyScopes = req.tokenGrant?.apiKeyScopes;
	const requiredScope: ApiKeyScope =
		direction === 'pull' ? 'sourceControl:pull' : 'sourceControl:push';
	if (!apiKeyScopes?.includes(requiredScope)) {
		throw new ForbiddenError('Forbidden');
	}
}

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

	status: [
		publicApiCompositeScope(STATUS_SCOPES),
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

			const direction = req.query.direction === 'pull' ? 'pull' : 'push';
			assertStatusApiKeyScope(req, direction);
			await Container.get(SourceControlScopedService).ensureIsAllowedToGetStatus(req);

			try {
				// Force a non-verbose diff so the response is a flat SourceControlledFile[]
				// that maps directly onto the push endpoint's `fileNames` input.
				const options = new SourceControlGetStatus({
					direction,
					preferLocalVersion: true,
					verbose: false,
				});
				const files = await Container.get(SourceControlService).getStatus(req.user, options);
				return res.status(200).json(files);
			} catch (error) {
				return res.status(400).send((error as { message: string }).message);
			}
		},
	],
};

export = sourceControlHandlers;
