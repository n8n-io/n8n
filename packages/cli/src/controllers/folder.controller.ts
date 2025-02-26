import {
	CreateFolderDto,
	DeleteFolderDto,
	ListFolderQueryDto,
	UpdateFolderDto,
} from '@n8n/api-types';
import { Response } from 'express';

import { Post, RestController, ProjectScope, Body, Get, Patch, Delete, Query } from '@/decorators';
import { FolderNotFoundError } from '@/errors/folder-not-found.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { ListQuery } from '@/requests';
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

	@Get('/:folderId/tree')
	@ProjectScope('folder:read')
	async getFolderTree(
		req: AuthenticatedRequest<{ projectId: string; folderId: string }>,
		_res: Response,
	) {
		const { projectId, folderId } = req.params;

		try {
			const tree = await this.folderService.getFolderTree(folderId, projectId);
			return tree;
		} catch (e) {
			if (e instanceof FolderNotFoundError) {
				throw new NotFoundError(e.message);
			}
			throw new InternalServerError();
		}
	}

	@Patch('/:folderId')
	@ProjectScope('folder:update')
	async updateFolder(
		req: AuthenticatedRequest<{ projectId: string; folderId: string }>,
		_res: Response,
		@Body payload: UpdateFolderDto,
	) {
		const { projectId, folderId } = req.params;

		try {
			await this.folderService.updateFolder(folderId, projectId, payload);
		} catch (e) {
			if (e instanceof FolderNotFoundError) {
				throw new NotFoundError(e.message);
			}
			throw new InternalServerError();
		}
	}

	@Delete('/:folderId')
	@ProjectScope('folder:delete')
	async deleteFolder(
		req: AuthenticatedRequest<{ projectId: string; folderId: string }>,
		_res: Response,
		@Body payload: DeleteFolderDto,
	) {
		const { projectId, folderId } = req.params;

		try {
			await this.folderService.deleteFolder(folderId, projectId, payload);
		} catch (e) {
			if (e instanceof FolderNotFoundError) {
				throw new NotFoundError(e.message);
			}
			throw new InternalServerError();
		}
	}

	@Get('/')
	@ProjectScope('folder:list')
	async listFolders(
		req: AuthenticatedRequest<{ projectId: string }>,
		res: Response,
		@Query payload: ListFolderQueryDto,
	) {
		const { projectId } = req.params;

		const [data, count] = await this.folderService.getManyAndCount(
			projectId,
			payload as ListQuery.Options,
		);

		res.json({ count, data });
	}
}
