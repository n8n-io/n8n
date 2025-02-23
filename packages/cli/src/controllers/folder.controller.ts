import { CreateFolderDto } from '@n8n/api-types';
import { Response } from 'express';

import { Post, RestController, ProjectScope, Body } from '@/decorators';
import { FolderNotFoundError } from '@/errors/folder-not-found.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { AuthenticatedRequest } from '@/requests';
import { FolderService } from '@/services/folder.service';

@RestController('/projects/:projectId/folders')
export class ProjectController {
	constructor(private readonly folderService: FolderService) {}

	@Post('/')
	@ProjectScope('folder:create')
	async createFolder(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Body payload: CreateFolderDto,
	) {
		try {
			const folder = await this.folderService.createFolder(payload, req.params.projectId);
			return folder;
		} catch (e) {
			if (e instanceof FolderNotFoundError) {
				throw new NotFoundError(e.message);
			}
			throw new InternalServerError();
		}
	}

	@Get('/:folderId')
	@ProjectScope('folder:read')
	async getFolder(
		req: AuthenticatedRequest<{ projectId: string; folderId: string }>,
		_res: Response,
	) {
		const project = await this.projectsService.getProject(req.params.projectId);

		const folder = await this.folderRepository.findOneOrFail({
			where: { id: req.params.folderId, homeProject: project },
		});

		return folder;
	}

	@Get('/:folderId/path')
	@ProjectScope('folder:read')
	async getFolderPathToRoot(
		req: AuthenticatedRequest<{ projectId: string; folderId: string }>,
		_res: Response,
	) {
		console.log('gpt requet');
		const response = await this.folderRepository.getFolderPath(req.params.folderId);

		return response;
	}
}
