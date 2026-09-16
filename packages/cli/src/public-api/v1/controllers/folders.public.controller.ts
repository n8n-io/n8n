import {
	FolderDetailsPublicDto,
	FolderListPublicDto,
	type FolderPublic,
	ListFoldersQueryPublicDto,
	folderIdParamSchema,
	projectIdParamSchema,
} from '@n8n/api-types';
import { LICENSE_FEATURES } from '@n8n/constants';
import type {
	AuthenticatedRequest,
	Folder,
	FolderWithWorkflowAndSubFolderCountAndPath,
} from '@n8n/db';
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
import { UserError } from 'n8n-workflow';

import { FolderNotFoundError } from '@/errors/folder-not-found.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
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

	@Get('/:folderId')
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
