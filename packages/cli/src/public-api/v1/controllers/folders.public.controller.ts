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
} from '@n8n/api-types';
import { LICENSE_FEATURES } from '@n8n/constants';
import type {
	AuthenticatedRequest,
	Folder,
	FolderWithWorkflowAndSubFolderCountAndPath,
	User,
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
import type { Scope } from '@n8n/permissions';
import type { Response } from 'express';

import { FolderNotFoundError } from '@/errors/folder-not-found.error';
import { BadRequestError, ForbiddenError, NotFoundError, UserError } from '@n8n/errors';
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
		@Param('projectId', folderProjectIdParamSchema) projectId: string,
		@Query query: ListFoldersQueryPublicDto,
	): Promise<FolderListPublicDto> {
		const resolvedProjectId = await this.resolveProjectWithScope(req.user, projectId, [
			'folder:list',
		]);

		const [data, count] = await this.folderService.getManyAndCount(resolvedProjectId, query);

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
		const resolvedProjectId = await this.resolveProjectWithScope(req.user, projectId, [
			'folder:create',
		]);

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
		@Param('projectId', folderProjectIdParamSchema) projectId: string,
		@Param('folderId', folderIdParamSchema) folderId: string,
	): Promise<FolderDetailsPublicDto> {
		const resolvedProjectId = await this.resolveProjectWithScope(req.user, projectId, [
			'folder:read',
		]);

		try {
			const { folder, totalSubFolders, totalWorkflows } =
				await this.folderService.findFolderWithContentCounts(folderId, resolvedProjectId);

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
		@Param('projectId', folderProjectIdParamSchema) projectId: string,
		@Param('folderId', folderIdParamSchema) folderId: string,
		@Body body: UpdateFolderPublicDto,
	): Promise<UpdatedFolderPublicDto> {
		const resolvedProjectId = await this.resolveProjectWithScope(req.user, projectId, [
			'folder:update',
		]);

		try {
			const folder = await this.folderService.updateFolder(folderId, resolvedProjectId, body);
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
		@Param('projectId', folderProjectIdParamSchema) projectId: string,
		@Param('folderId', folderIdParamSchema) folderId: string,
		@Query query: DeleteFolderQueryPublicDto,
	): Promise<void> {
		const resolvedProjectId = await this.resolveProjectWithScope(req.user, projectId, [
			'folder:delete',
		]);

		try {
			await this.folderService.deleteFolder(req.user, folderId, resolvedProjectId, query, req.ctx);
		} catch (error) {
			return handleError(error);
		}
	}

	/**
	 * Resolves the `personal` alias, then checks the user holds the scopes in the project. A manual
	 * check instead of `@ProjectScope`: an unknown project has to answer 404, not 403.
	 */
	private async resolveProjectWithScope(
		user: User,
		projectId: string,
		scopes: Scope[],
	): Promise<string> {
		let resolvedProjectId = projectId;

		if (projectId === PERSONAL_PROJECT_ALIAS) {
			const personalProject = await this.projectService.getPersonalProject(user);
			if (!personalProject) {
				throw new NotFoundError('Could not find a personal project for this user');
			}
			resolvedProjectId = personalProject.id;
		}

		if (!(await this.projectService.findProject(resolvedProjectId))) {
			throw new NotFoundError(`Project with ID "${resolvedProjectId}" not found`);
		}

		if (!(await this.projectService.getProjectWithScope(user, resolvedProjectId, scopes))) {
			throw new ForbiddenError();
		}

		return resolvedProjectId;
	}
}
