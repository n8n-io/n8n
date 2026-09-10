import {
	PullWorkFolderRequestDto,
	SourceControlPullResponsePublicDto,
	SourceControlPushConflictErrorPublicDto,
	SourceControlPushRequestPublicDto,
	SourceControlPushResponsePublicDto,
	SourceControlStatusPublicDto,
	SourceControlStatusQueryPublicDto,
} from '@n8n/api-types';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { AuthenticatedRequest } from '@n8n/db';
import {
	ApiDescription,
	ApiErrorResponse,
	ApiKeyScope,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Body,
	Get,
	Licensed,
	Post,
	PublicApiController,
	Query,
} from '@n8n/decorators';
import type { Response } from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { EventService } from '@/events/event.service';
import { getTrackingInformationFromPullResult } from '@/modules/source-control.ee/source-control-helper.ee';
import { SourceControlPreferencesService } from '@/modules/source-control.ee/source-control-preferences.service.ee';
import { SourceControlScopedService } from '@/modules/source-control.ee/source-control-scoped.service';
import { SourceControlService } from '@/modules/source-control.ee/source-control.service.ee';

const tags = ['SourceControl'];

@PublicApiController('/source-control')
export class SourceControlPublicController {
	constructor(
		private readonly sourceControlService: SourceControlService,
		private readonly sourceControlPreferencesService: SourceControlPreferencesService,
		private readonly sourceControlScopedService: SourceControlScopedService,
		private readonly eventService: EventService,
	) {}

	@Get('/status')
	@Licensed(LICENSE_FEATURES.SOURCE_CONTROL)
	@ApiKeyScope('sourceControl:read')
	@ApiSummary('Preview pending source control changes')
	@ApiDescription(
		'Previews the pending changes between the instance and the connected Git branch in either the `push` or `pull` direction.',
	)
	@ApiTags(tags)
	@ApiResponse(200, SourceControlStatusPublicDto)
	async getSourceControlStatus(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: SourceControlStatusQueryPublicDto,
	): Promise<SourceControlStatusPublicDto> {
		await this.sourceControlScopedService.ensureIsAllowedToGetStatus(req);

		if (!this.sourceControlPreferencesService.isSourceControlConnected()) {
			throw new BadRequestError('Source Control is not connected to a repository');
		}

		const result = await this.sourceControlService.getStatus(req.user, {
			direction: query.direction,
			preferLocalVersion: query.direction === 'push',
			verbose: false,
			origin: 'publicApi',
		});

		// `verbose: false` above guarantees a flat file list at runtime, narrow explicitly rather than casting.
		const files = Array.isArray(result) ? result : result.sourceControlledFiles;

		return { data: files };
	}

	@Post('/push')
	@Licensed(LICENSE_FEATURES.SOURCE_CONTROL)
	@ApiKeyScope('sourceControl:push')
	@ApiSummary('Push local source control changes')
	@ApiDescription(
		'Commits and pushes the selected files to the connected Git branch. Each entry in ' +
			'`fileNames` is resolved against a fresh preview of the pending changes.',
	)
	@ApiTags(tags)
	@ApiResponse(200, SourceControlPushResponsePublicDto)
	@ApiErrorResponse(400)
	@ApiErrorResponse(403)
	@ApiErrorResponse(409, {
		dto: SourceControlPushConflictErrorPublicDto,
		description:
			'The push includes files with unresolved conflicts. Retry with `force: true` to push anyway.',
	})
	async pushSourceControl(
		req: AuthenticatedRequest,
		_res: Response,
		@Body body: SourceControlPushRequestPublicDto,
	): Promise<SourceControlPushResponsePublicDto> {
		await this.sourceControlScopedService.ensureIsAllowedToPush(req);

		if (!this.sourceControlPreferencesService.isSourceControlConnected()) {
			throw new BadRequestError('Source Control is not connected to a repository');
		}

		const result = await this.sourceControlService.pushWorkfolder(
			req.user,
			{
				commitMessage: body.commitMessage,
				fileNames: body.fileNames,
				force: body.force,
			},
			'publicApi',
		);

		if (result.statusCode === 409) {
			const conflicts = result.statusResult.filter((file) => file.conflict);
			throw new ConflictError(
				'Push blocked by conflicting files. Pass `force: true` to push anyway.',
				undefined,
				{ conflicts },
			);
		}

		return { data: result.statusResult };
	}

	@Post('/pull')
	@Licensed(LICENSE_FEATURES.SOURCE_CONTROL)
	@ApiKeyScope('sourceControl:pull')
	@ApiSummary('Pull changes from the remote repository')
	@ApiDescription('Fetches changes from the connected Git branch into the instance.')
	@ApiTags(tags)
	@ApiResponse(200, SourceControlPullResponsePublicDto)
	@ApiErrorResponse(400)
	@ApiErrorResponse(409, {
		dto: SourceControlPullResponsePublicDto,
		description:
			'Conflict due to uncommitted local changes or merge conflicts. The response body lists ' +
			'every file in the pull diff; files causing the conflict have `conflict: true` or ' +
			'`status: modified`. Retry with `force: true` to discard local changes.',
	})
	async pullSourceControl(
		req: AuthenticatedRequest,
		res: Response,
		@Body({ required: true }) body: PullWorkFolderRequestDto,
	): Promise<void> {
		// Writes the response directly preserving migrated endpoints contract
		if (!this.sourceControlPreferencesService.isSourceControlConnected()) {
			res
				.status(400)
				.json({ status: 'Error', message: 'Source Control is not connected to a repository' });
			return;
		}

		try {
			const result = await this.sourceControlService.pullWorkfolder(req.user, body);

			if (result.statusCode === 200) {
				this.eventService.emit('source-control-user-pulled-api', {
					...getTrackingInformationFromPullResult(req.user.id, result.statusResult),
					forced: body.force ?? false,
				});
				res.status(200).json(result.statusResult);
				return;
			}

			res.status(409).json(result.statusResult);
		} catch (error) {
			res.status(400).send((error as { message: string }).message);
		}
	}
}
