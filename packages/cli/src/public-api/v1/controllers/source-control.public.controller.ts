import { SourceControlStatusPublicDto, SourceControlStatusQueryPublicDto } from '@n8n/api-types';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { AuthenticatedRequest } from '@n8n/db';
import {
	ApiDescription,
	ApiKeyScope,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Get,
	Licensed,
	PublicApiController,
	Query,
} from '@n8n/decorators';
import type { Response } from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { SourceControlPreferencesService } from '@/modules/source-control.ee/source-control-preferences.service.ee';
import { SourceControlScopedService } from '@/modules/source-control.ee/source-control-scoped.service';
import { SourceControlService } from '@/modules/source-control.ee/source-control.service.ee';
import { resolveOffsetPagination } from '@/public-api/v1/shared/services/pagination.service';
import { paginateSourceControlledFiles } from '@/public-api/v1/shared/services/source-controlled-file-pagination.service';

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
		'Previews the pending changes between the instance and the connected Git repository, ' +
			'in either direction. Does not modify the instance or the repository, but recomputes ' +
			'the diff on every call, so treat each page as a fresh snapshot rather than a stable one.',
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

		const { offset, limit } = resolveOffsetPagination({ ...query, validateCursor: true });

		const result = await this.sourceControlService.getStatus(req.user, {
			direction: query.direction,
			preferLocalVersion: query.direction === 'push',
			verbose: false,
			origin: 'publicApi',
		});

		// `verbose: false` above guarantees a flat file list at runtime, narrow explicitly rather than casting.
		const files = Array.isArray(result) ? result : result.sourceControlledFiles;

		return paginateSourceControlledFiles(files, { offset, limit });
	}
}
