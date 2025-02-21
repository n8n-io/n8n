import { CreateFolderDto } from '@n8n/api-types';
import { Response } from 'express';

import { FolderRepository } from '@/databases/repositories/folder.repository';
import { Post, RestController, ProjectScope, Body, Get } from '@/decorators';
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

			let parentFolder = null;

			if (payload.parentFolderId) {
				parentFolder = await this.folderRepository.findOneOrFail({
					where: {
						id: payload.parentFolderId,
						homeProject: {
							id: project.id,
						},
					},
				});
			}

			const { homeProject, ...folder } = await this.folderRepository.save(
				this.folderRepository.create({
					name: payload.name,
					homeProject: project,
					parentFolder,
				}),
			);

			return folder;
		} catch (e) {
			throw e;
		}
	}

	@Get('/:folderId')
	@ProjectScope('folder:read')
	async getFolder(
		req: AuthenticatedRequest<{ projectId: string; folderId: string }>,
		_res: Response,
	) {
		try {
			const project = await this.projectsService.getProject(req.params.projectId);

			const folder = await this.folderRepository.findOneOrFail({
				where: { id: req.params.folderId, homeProject: project },
			});

			return folder;
		} catch (e) {
			throw e;
		}
	}

	@Get('/:folderId/path')
	@ProjectScope('folder:read')
	async getFolderPathToRoot(
		req: AuthenticatedRequest<{ projectId: string; folderId: string }>,
		_res: Response,
	) {
		try {
			const response = await this.folderRepository.getFolderPathTypeORM(
				this.folderRepository,
				req.params.folderId,
			);

			return response;
		} catch (e) {
			throw e;
		}
	}
}
