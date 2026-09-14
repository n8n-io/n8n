import {
	FolderPublicDto,
	UpdateFolderPublicDto,
	folderIdParamSchema,
	projectIdParamSchema,
} from '@n8n/api-types';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { AuthenticatedRequest, Folder } from '@n8n/db';
import {
	ApiDescription,
	ApiErrorResponse,
	ApiKeyScope,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Body,
	Licensed,
	Param,
	Patch,
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

const toFolderPublicDto = (folder: Folder): FolderPublicDto => ({
	id: folder.id,
	name: folder.name,
	parentFolderId: folder.parentFolderId,
	createdAt: folder.createdAt.toISOString(),
	updatedAt: folder.updatedAt.toISOString(),
});

/** Same mapping the eov handler did: a missing folder is a 404, any other user error a 400. */
const mapFolderError = (error: unknown): never => {
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

	@Patch('/:projectId/folders/:folderId')
	@Licensed(LICENSE_FEATURES.FOLDERS)
	@ApiKeyScope('folder:update')
	@ApiSummary('Update a folder')
	@ApiDescription('Update folder name or parent folder.')
	@ApiTags(tags)
	@ApiResponse(200, FolderPublicDto)
	@ApiErrorResponse(404)
	async updateFolder(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId', projectIdParamSchema) projectId: string,
		@Param('folderId', folderIdParamSchema) folderId: string,
		@Body body: UpdateFolderPublicDto,
	): Promise<FolderPublicDto> {
		// A manual check, not `@ProjectScope`: an unknown project has to stay a 404, not a 403.
		await assertProjectScope(req.user, projectId, ['folder:update']);

		try {
			const folder = await this.folderService.updateFolder(folderId, projectId, body);
			return toFolderPublicDto(folder);
		} catch (error) {
			return mapFolderError(error);
		}
	}
}
