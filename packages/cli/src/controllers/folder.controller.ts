import { CreateFolderDto } from '@n8n/api-types';
import { Response } from 'express';

import { FolderRepository } from '@/databases/repositories/folder.repository';
import { Post, RestController, ProjectScope, Body } from '@/decorators';
import { FolderNotFoundError } from '@/errors/folder-not-found.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { AuthenticatedRequest } from '@/requests';
import { ProjectService } from '@/services/project.service.ee';

@RestController('/projects/:projectId/folders')
export class ProjectController {
	constructor(
		private readonly projectsService: ProjectService,
		private readonly folderRepository: FolderRepository,
	) {}

	@Post('/')
	@ProjectScope('folder:create')
	async createFolder(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Body payload: CreateFolderDto,
	) {
		try {
			const project = await this.projectsService.getProject(req.params.projectId);
			const folder = await this.folderRepository.createFolder(payload, project);
			return folder;
		} catch (e) {
			if (e instanceof FolderNotFoundError) {
				throw new NotFoundError(e.message);
			}
			throw new InternalServerError();
		}
	}
}
