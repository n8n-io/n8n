import {
	FolderListPublicDto,
	type FolderPublic,
	ListFoldersQueryPublicDto,
	projectIdParamSchema,
} from '@n8n/api-types';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { AuthenticatedRequest, FolderWithWorkflowAndSubFolderCountAndPath } from '@n8n/db';
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
	Query,
} from '@n8n/decorators';
import type { Response } from 'express';

import { assertProjectScope } from '@/public-api/v1/shared/services/utils.service';
import { FolderService } from '@/services/folder.service';

const tags = ['Folders'];

/**
 * The `select` query parameter decides which columns the query loads, so a field the caller did not
 * ask for is left `undefined` and drops out of the JSON body.
 */
const toFolderPublicDto = (folder: FolderWithWorkflowAndSubFolderCountAndPath): FolderPublic => ({
	id: folder.id,
	name: folder.name,
	parentFolderId: folder.parentFolderId,
	createdAt: folder.createdAt?.toISOString(),
	updatedAt: folder.updatedAt?.toISOString(),
	homeProject: folder.homeProject && {
		id: folder.homeProject.id,
		name: folder.homeProject.name,
		type: folder.homeProject.type,
		icon: folder.homeProject.icon,
	},
	parentFolder: folder.parentFolder && {
		id: folder.parentFolder.id,
		name: folder.parentFolder.name,
		parentFolderId: folder.parentFolder.parentFolderId,
	},
	tags: folder.tags?.map((tag) => ({ id: tag.id, name: tag.name })),
	workflowCount: folder.workflowCount,
	subFolderCount: folder.subFolderCount,
	path: folder.path,
});

@PublicApiController('/projects/:projectId/folders')
export class FoldersPublicController {
	constructor(private readonly folderService: FolderService) {}

	@Get('/')
	@Licensed(LICENSE_FEATURES.FOLDERS)
	@ApiKeyScope('folder:list')
	@ApiSummary('Retrieve folders')
	@ApiDescription(
		'Retrieve folders within a project. Supports filtering, sorting, field selection, and pagination.',
	)
	@ApiTags(tags)
	@ApiResponse(200, FolderListPublicDto)
	@ApiErrorResponse(404)
	async listFolders(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId', projectIdParamSchema) projectId: string,
		@Query query: ListFoldersQueryPublicDto,
	): Promise<FolderListPublicDto> {
		// Kept in the handler: it answers 404 for an unknown project, which @ProjectScope cannot do.
		await assertProjectScope(req.user, projectId, ['folder:list']);

		const [data, count] = await this.folderService.getManyAndCount(projectId, query);

		return { count, data: data.map(toFolderPublicDto) };
	}
}
