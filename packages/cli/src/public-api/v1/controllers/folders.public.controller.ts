import { FolderDetailsPublicDto, folderIdParamSchema, projectIdParamSchema } from '@n8n/api-types';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { AuthenticatedRequest, Folder } from '@n8n/db';
import {
	ApiDescription,
	ApiErrorResponse,
	ApiKeyScope,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Get,
	Licensed,
	Param,
	PublicApiController,
} from '@n8n/decorators';
import type { Response } from 'express';
import { UserError } from 'n8n-workflow';

import { FolderNotFoundError } from '@/errors/folder-not-found.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { assertProjectScope } from '@/public-api/v1/shared/services/utils.service';
import { FolderService } from '@/services/folder.service';

const tags = ['Folders'];

const toFolderDetailsPublicDto = (
	folder: Folder,
	totalSubFolders: number,
	totalWorkflows: number,
): FolderDetailsPublicDto => ({
	id: folder.id,
	name: folder.name,
	parentFolderId: folder.parentFolderId,
	createdAt: folder.createdAt.toISOString(),
	updatedAt: folder.updatedAt.toISOString(),
	totalSubFolders,
	totalWorkflows,
});

const handleError = (error: unknown): never => {
	if (error instanceof FolderNotFoundError) {
		throw new NotFoundError(error.message);
	}
	if (error instanceof UserError) {
		throw new BadRequestError(error.message);
	}

	throw error;
};

@PublicApiController('/projects')
export class FoldersPublicController {
	constructor(private readonly folderService: FolderService) {}

	@Get('/:projectId/folders/:folderId')
	@ApiKeyScope('folder:read')
	@Licensed(LICENSE_FEATURES.FOLDERS)
	@ApiSummary('Get folder details')
	@ApiDescription('Get folder details including sub-folder and workflow counts.')
	@ApiTags(tags)
	@ApiResponse(200, FolderDetailsPublicDto)
	@ApiErrorResponse(404)
	async getFolder(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId', projectIdParamSchema) projectId: string,
		@Param('folderId', folderIdParamSchema) folderId: string,
	): Promise<FolderDetailsPublicDto> {
		// Kept as a manual check: it answers 404 for an unknown project, which `@ProjectScope` cannot.
		await assertProjectScope(req.user, projectId, ['folder:read']);

		try {
			const { folder, totalSubFolders, totalWorkflows } =
				await this.folderService.findFolderWithContentCounts(folderId, projectId);

			return toFolderDetailsPublicDto(folder, totalSubFolders, totalWorkflows);
		} catch (error) {
			return handleError(error);
		}
	}
}
