import {
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
import { SourceControlPushConflictError } from '@/errors/response-errors/source-control-push-conflict.error';
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
	) {}

	@Get('/status')
	@Licensed(LICENSE_FEATURES.SOURCE_CONTROL)
	@ApiKeyScope('sourceControl:read')
	@ApiSummary('Preview pending source control changes')
	@ApiDescription(
		'Previews the pending changes between the instance and the connected Git repository in either the `push` or `pull` direction.',
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
		'Commits and pushes the selected files to the connected Git repository. Each entry in ' +
			'`fileNames` is resolved against a fresh preview of the pending changes: only its ' +
			'`id` and `type` are read, so the file path, status, and conflict state pushed are ' +
			'always the server-derived ones, never client-supplied. Call `GET /source-control/status`' +
			' with `direction=push` first to see what is eligible.',
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
			{ origin: 'publicApi' },
		);

		if (result.statusCode === 409) {
			throw new SourceControlPushConflictError(result.statusResult);
		}

		return { data: result.statusResult };
	}
}
