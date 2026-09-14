import {
	DeleteFolderQueryPublicDto,
	folderIdParamSchema,
	projectIdParamSchema,
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
	Delete,
	Licensed,
	Param,
	PublicApiController,
	Query,
} from '@n8n/decorators';
import type { Response } from 'express';
import { UserError } from 'n8n-workflow';

import { FolderNotFoundError } from '@/errors/folder-not-found.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { assertProjectScope } from '@/public-api/v1/shared/services/utils.service';
import { FolderService } from '@/services/folder.service';

const tags = ['Folders'];

@PublicApiController('/projects')
export class FoldersPublicController {
	constructor(private readonly folderService: FolderService) {}

	@Delete('/:projectId/folders/:folderId')
	@Licensed(LICENSE_FEATURES.FOLDERS)
	@ApiKeyScope('folder:delete')
	@ApiSummary('Delete a folder')
	@ApiDescription(
		'Delete a folder within a project. When `transferToFolderId` is provided, workflows and ' +
			'sub-folders are moved to the target folder before deletion. When omitted, workflows are ' +
			'moved to the project root and archived, and child folders are deleted.',
	)
	@ApiTags(tags)
	@ApiResponse(204)
	@ApiErrorResponse(404)
	async deleteFolder(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId', projectIdParamSchema) projectId: string,
		@Param('folderId', folderIdParamSchema) folderId: string,
		@Query query: DeleteFolderQueryPublicDto,
	): Promise<void> {
		// Stays a manual check: an unknown project answers 404 here, where `@ProjectScope` answers 403.
		await assertProjectScope(req.user, projectId, ['folder:delete']);

		try {
			await this.folderService.deleteFolder(req.user, folderId, projectId, query);
		} catch (error) {
			if (error instanceof FolderNotFoundError) {
				throw new NotFoundError(error.message);
			}
			if (error instanceof UserError) {
				throw new BadRequestError(error.message);
			}
			throw error;
		}
	}
}
