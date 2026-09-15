import { CreateFolderPublicDto, FolderPublicDto, folderProjectIdParamSchema } from '@n8n/api-types';
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
	Post,
	PublicApiController,
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

/** `createFolder` returns the saved entity without its home project. */
type CreatedFolder = Omit<Folder, 'homeProject'>;

const toFolderPublicDto = (folder: CreatedFolder): FolderPublicDto => ({
	id: folder.id,
	name: folder.name,
	parentFolderId: folder.parentFolderId ?? folder.parentFolder?.id ?? null,
	createdAt: folder.createdAt.toISOString(),
	updatedAt: folder.updatedAt.toISOString(),
});

/** Mirrors the legacy handler: a missing folder is a 404, any other user error a 400. */
const rethrowAsHttpError = (error: unknown): never => {
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

	@Post('/')
	@Licensed(LICENSE_FEATURES.FOLDERS)
	@ApiKeyScope('folder:create')
	@ApiSummary('Create a folder')
	@ApiDescription('Create a folder within a project.')
	@ApiTags(tags)
	@ApiResponse(201, FolderPublicDto)
	@ApiErrorResponse(404)
	async createFolder(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId', folderProjectIdParamSchema) projectId: string,
		@Body body: CreateFolderPublicDto,
	): Promise<FolderPublicDto> {
		const resolvedProjectId = await this.resolveProjectId(req, projectId);

		// A 404 for an unknown project, so `@ProjectScope` (which answers 403) cannot be used here.
		await assertProjectScope(req.user, resolvedProjectId, ['folder:create']);

		try {
			return toFolderPublicDto(await this.folderService.createFolder(body, resolvedProjectId));
		} catch (error) {
			return rethrowAsHttpError(error);
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
