import {
	CreateFolderPublicDto,
	CreatedFolderPublicDto,
	DeleteFolderQueryPublicDto,
	FolderDetailsPublicDto,
	FolderListPublicDto,
	type FolderPublic,
	ListFoldersQueryPublicDto,
	UpdateFolderPublicDto,
	UpdatedFolderPublicDto,
	folderIdParamSchema,
	folderProjectIdParamSchema,
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
	Body,
	Delete,
	Get,
	Licensed,
	Param,
	Patch,
	Post,
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
import { ProjectService } from '@/services/project.service.ee';

const tags = ['Folders'];

const PERSONAL_PROJECT_ALIAS = 'personal';

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

const toUpdatedFolderPublicDto = (folder: Folder): UpdatedFolderPublicDto => ({
	id: folder.id,
	name: folder.name,
	parentFolderId: folder.parentFolderId,
	createdAt: folder.createdAt.toISOString(),
	updatedAt: folder.updatedAt.toISOString(),
});

type CreatedFolder = Omit<Folder, 'homeProject'>;

const toCreatedFolderPublicDto = (folder: CreatedFolder): CreatedFolderPublicDto => ({
	id: folder.id,
	name: folder.name,
	parentFolderId: folder.parentFolderId ?? folder.parentFolder?.id ?? null,
	createdAt: folder.createdAt.toISOString(),
	updatedAt: folder.updatedAt.toISOString(),
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
	constructor(
		private readonly folderService: FolderService,
		private readonly projectService: ProjectService,
	) {}

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

	@Post('/')
	@Licensed(LICENSE_FEATURES.FOLDERS)
	@ApiKeyScope('folder:create')
	@ApiSummary('Create a folder')
	@ApiDescription('Create a folder within a project.')
	@ApiTags(tags)
	@ApiResponse(201, CreatedFolderPublicDto)
	@ApiErrorResponse(404)
	async createFolder(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId', folderProjectIdParamSchema) projectId: string,
		@Body body: CreateFolderPublicDto,
	): Promise<CreatedFolderPublicDto> {
		const resolvedProjectId = await this.resolveProjectId(req, projectId);

		// A 404 for an unknown project, so `@ProjectScope` (which answers 403) cannot be used here.
		await assertProjectScope(req.user, resolvedProjectId, ['folder:create']);

		try {
			return toCreatedFolderPublicDto(
				await this.folderService.createFolder(body, resolvedProjectId),
			);
		} catch (error) {
			return handleError(error);
		}
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

	@Patch('/:folderId')
	@Licensed(LICENSE_FEATURES.FOLDERS)
	@ApiKeyScope('folder:update')
	@ApiSummary('Update a folder')
	@ApiDescription('Update folder name or parent folder.')
	@ApiTags(tags)
	@ApiResponse(200, UpdatedFolderPublicDto)
	@ApiErrorResponse(404)
	async updateFolder(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId', projectIdParamSchema) projectId: string,
		@Param('folderId', folderIdParamSchema) folderId: string,
		@Body body: UpdateFolderPublicDto,
	): Promise<UpdatedFolderPublicDto> {
		// A manual check, not `@ProjectScope`: an unknown project has to stay a 404, not a 403.
		await assertProjectScope(req.user, projectId, ['folder:update']);

		try {
			const folder = await this.folderService.updateFolder(folderId, projectId, body);
			return toUpdatedFolderPublicDto(folder);
		} catch (error) {
			return handleError(error);
		}
	}

	@Delete('/:folderId')
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
			return handleError(error);
		}
	}

	private async resolveProjectId(req: AuthenticatedRequest, projectId: string): Promise<string> {
		if (projectId !== PERSONAL_PROJECT_ALIAS) return projectId;

		const personalProject = await this.projectService.getPersonalProject(req.user);
		if (!personalProject) {
			throw new NotFoundError('Could not find a personal project for this user');
		}

		return personalProject.id;
	}
}
