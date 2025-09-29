import {
	CreateFolderDto,
	DeleteFolderDto,
	ListFolderQueryDto,
	TransferFolderBodyDto,
	UpdateFolderDto,
} from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import {
	Post,
	RestController,
	ProjectScope,
	Body,
	Get,
	Patch,
	Delete,
	Query,
	Put,
	Param,
	Licensed,
	Middleware,
} from '@n8n/decorators';
import { NextFunction, Response } from 'express';
import { UserError } from 'n8n-workflow';

import { FolderNotFoundError } from '@/errors/folder-not-found.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { FolderService } from '@/services/folder.service';
import { EnterpriseWorkflowService } from '@/workflows/workflow.service.ee';
import { ProjectService } from '@/services/project.service.ee';

@RestController('/projects/:projectId/folders')
export class ProjectController {
	constructor(
		private readonly folderService: FolderService,
		private readonly enterpriseWorkflowService: EnterpriseWorkflowService,
		private readonly projectService: ProjectService,
	) {}

	@Middleware()
	async validateProjectExists(
		req: AuthenticatedRequest<{ projectId: string }>,
		res: Response,
		next: NextFunction,
	) {
		try {
			const { projectId } = req.params;
			await this.projectService.getProject(projectId);
			next();
		} catch (e) {
			res.status(404).send('Project not found');
			return;
		}
	}

	@Post('/')
	@ProjectScope('folder:create')
	@Licensed('feat:folders')
	async createFolder(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Body payload: CreateFolderDto,
	) {
		const { projectId } = req.params;

		try {
			const folder = await this.folderService.createFolder(payload, projectId);
			return folder;
		} catch (e) {
			if (e instanceof FolderNotFoundError) {
				throw new NotFoundError(e.message);
			}
			throw new InternalServerError(undefined, e);
		}
	}

	@Get('/:folderId/tree')
	@ProjectScope('folder:read')
	@Licensed('feat:folders')
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
			throw new InternalServerError(undefined, e);
		}
	}

	@Get('/:folderId/credentials')
	@ProjectScope('folder:read')
	@Licensed('feat:folders')
	async getFolderUsedCredentials(
		req: AuthenticatedRequest<{ projectId: string; folderId: string }>,
		_res: Response,
	) {
		const { projectId, folderId } = req.params;

		try {
			const credentials = await this.enterpriseWorkflowService.getFolderUsedCredentials(
				req.user,
				folderId,
				projectId,
			);
			return credentials;
		} catch (e) {
			if (e instanceof FolderNotFoundError) {
				throw new NotFoundError(e.message);
			}
			throw new InternalServerError(undefined, e);
		}
	}

	@Patch('/:folderId')
	@ProjectScope('folder:update')
	@Licensed('feat:folders')
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
			} else if (e instanceof UserError) {
				throw new BadRequestError(e.message);
			}
			throw new InternalServerError(undefined, e);
		}
	}

	@Delete('/:folderId')
	@ProjectScope('folder:delete')
	@Licensed('feat:folders')
	async deleteFolder(
		req: AuthenticatedRequest<{ projectId: string; folderId: string }>,
		_res: Response,
		@Query payload: DeleteFolderDto,
	) {
		const { projectId, folderId } = req.params;

		try {
			await this.folderService.deleteFolder(req.user, folderId, projectId, payload);
		} catch (e) {
			if (e instanceof FolderNotFoundError) {
				throw new NotFoundError(e.message);
			} else if (e instanceof UserError) {
				throw new BadRequestError(e.message);
			}
			throw new InternalServerError(undefined, e);
		}
	}

	@Get('/')
	@ProjectScope('folder:list')
	@Licensed('feat:folders')
	async listFolders(
		req: AuthenticatedRequest<{ projectId: string }>,
		res: Response,
		@Query payload: ListFolderQueryDto,
	) {
		const { projectId } = req.params;

		const [data, count] = await this.folderService.getManyAndCount(projectId, payload);

		res.json({ count, data });
	}

	@Get('/:folderId/content')
	@ProjectScope('folder:read')
	@Licensed('feat:folders')
	async getFolderContent(req: AuthenticatedRequest<{ projectId: string; folderId: string }>) {
		const { projectId, folderId } = req.params;

		try {
			const { totalSubFolders, totalWorkflows } =
				await this.folderService.getFolderAndWorkflowCount(folderId, projectId);

			return {
				totalSubFolders,
				totalWorkflows,
			};
		} catch (e) {
			if (e instanceof FolderNotFoundError) {
				throw new NotFoundError(e.message);
			}
			throw new InternalServerError(undefined, e);
		}
	}

	@Put('/:folderId/transfer')
	@ProjectScope('folder:move')
	@Licensed('feat:folders')
	async transferFolderToProject(
		req: AuthenticatedRequest,
		_res: unknown,
		@Param('folderId') sourceFolderId: string,
		@Param('projectId') sourceProjectId: string,
		@Body body: TransferFolderBodyDto,
	) {
		return await this.enterpriseWorkflowService.transferFolder(
			req.user,
			sourceProjectId,
			sourceFolderId,
			body.destinationProjectId,
			body.destinationParentFolderId,
			body.shareCredentials,
		);
	}
}
