import {
	CreateFolderDto,
	DeleteFolderDto,
	ListFolderQueryDto,
	TransferFolderBodyDto,
	TransferPreviewQueryDto,
	UpdateFolderDto,
	type FolderTransferPreview,
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

import { FolderNotFoundError } from '@/errors/folder-not-found.error';
import {
	BadRequestError,
	ForbiddenError,
	InternalServerError,
	NotFoundError,
	UserError,
} from '@n8n/errors';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { Telemetry } from '@/telemetry';
import { FolderService } from '@/services/folder.service';
import { ProjectService } from '@/services/project.service.ee';
import { EnterpriseWorkflowService } from '@/workflows/workflow.service.ee';

@RestController('/projects/:projectId/folders')
export class ProjectController {
	constructor(
		private readonly folderService: FolderService,
		private readonly enterpriseWorkflowService: EnterpriseWorkflowService,
		private readonly projectService: ProjectService,
		private readonly telemetry: Telemetry,
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
			this.telemetry.track(TELEMETRY_EVENT.PLATFORM.RESOURCE_FOLDER_CHANGED, {
				user_id: req.user.id,
				project_id: projectId,
				resource_type: folder.resourceType,
				action: 'created',
				source: 'rest',
				folder_id: folder.id,
				target_folder_id: folder.parentFolderId ?? null,
				folder_count: 1,
			});

			return folder;
		} catch (e) {
			if (
				e instanceof ForbiddenError ||
				e instanceof BadRequestError ||
				e instanceof NotFoundError
			) {
				throw e;
			}

			if (e instanceof UserError) {
				throw new BadRequestError(e.message);
			}

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
			if (
				e instanceof ForbiddenError ||
				e instanceof BadRequestError ||
				e instanceof NotFoundError
			) {
				throw e;
			}

			if (e instanceof UserError) {
				throw new BadRequestError(e.message);
			}

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
			await this.folderService.assertWorkflowFolder(folderId, projectId);
			const credentials = await this.enterpriseWorkflowService.getFolderUsedCredentials(
				req.user,
				folderId,
				projectId,
			);
			return credentials;
		} catch (e) {
			if (
				e instanceof ForbiddenError ||
				e instanceof BadRequestError ||
				e instanceof NotFoundError
			) {
				throw e;
			}

			if (e instanceof UserError) {
				throw new BadRequestError(e.message);
			}

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
			await this.folderService.assertContentAccess(req.user, folderId, projectId, 'update');
			const folder = await this.folderService.updateFolder(folderId, projectId, payload);
			this.telemetry.track(TELEMETRY_EVENT.PLATFORM.RESOURCE_FOLDER_CHANGED, {
				user_id: req.user.id,
				project_id: projectId,
				resource_type: folder.resourceType,
				action: payload.parentFolderId ? 'moved' : 'updated',
				source: 'rest',
				folder_id: folderId,
				target_folder_id: folder.parentFolderId ?? null,
				folder_count: 1,
			});
		} catch (e) {
			if (
				e instanceof ForbiddenError ||
				e instanceof BadRequestError ||
				e instanceof NotFoundError
			) {
				throw e;
			}

			if (e instanceof UserError) {
				throw new BadRequestError(e.message);
			}

			if (e instanceof FolderNotFoundError) {
				throw new NotFoundError(e.message);
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
			const folder = await this.folderService.findFolderInProjectOrFail(folderId, projectId);
			const counts = await this.folderService.findFolderWithContentCounts(folderId, projectId);
			await this.folderService.deleteFolder(req.user, folderId, projectId, payload);
			this.telemetry.track(TELEMETRY_EVENT.PLATFORM.RESOURCE_FOLDER_CHANGED, {
				user_id: req.user.id,
				project_id: projectId,
				resource_type: folder.resourceType,
				action: payload.transferToFolderId ? 'relocated' : 'deleted',
				source: 'rest',
				folder_id: folderId,
				target_folder_id: payload.transferToFolderId ?? null,
				folder_count: payload.transferToFolderId ? 1 : counts.totalSubFolders + 1,
				resource_count:
					folder.resourceType === 'agent' ? counts.totalAgents : counts.totalWorkflows,
			});
		} catch (e) {
			if (
				e instanceof ForbiddenError ||
				e instanceof BadRequestError ||
				e instanceof NotFoundError
			) {
				throw e;
			}

			if (e instanceof UserError) {
				throw new BadRequestError(e.message);
			}

			if (e instanceof FolderNotFoundError) {
				throw new NotFoundError(e.message);
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

		if (payload.resourceType === 'agent') {
			await this.folderService.assertAgentContentAccess(req.user, projectId, 'read');
		}

		const [data, count] = await this.folderService.getManyAndCount(projectId, payload);

		res.json({ count, data });
	}

	@Get('/:folderId/content')
	@ProjectScope('folder:read')
	@Licensed('feat:folders')
	async getFolderContent(req: AuthenticatedRequest<{ projectId: string; folderId: string }>) {
		const { projectId, folderId } = req.params;

		try {
			await this.folderService.assertContentAccess(req.user, folderId, projectId, 'read');
			const { totalSubFolders, totalWorkflows, totalAgents } =
				await this.folderService.findFolderWithContentCounts(folderId, projectId);

			return {
				totalSubFolders,
				totalWorkflows,
				totalAgents,
			};
		} catch (e) {
			if (
				e instanceof ForbiddenError ||
				e instanceof BadRequestError ||
				e instanceof NotFoundError
			) {
				throw e;
			}

			if (e instanceof UserError) {
				throw new BadRequestError(e.message);
			}

			if (e instanceof FolderNotFoundError) {
				throw new NotFoundError(e.message);
			}
			throw new InternalServerError(undefined, e);
		}
	}

	@Get('/:folderId/transfer-preview')
	@ProjectScope('folder:move')
	@Licensed('feat:folders')
	async transferFolderPreview(
		req: AuthenticatedRequest,
		_res: unknown,
		@Param('folderId') sourceFolderId: string,
		@Param('projectId') sourceProjectId: string,
		@Query query: TransferPreviewQueryDto,
	): Promise<FolderTransferPreview> {
		try {
			await this.folderService.assertWorkflowFolder(sourceFolderId, sourceProjectId);
			return await this.enterpriseWorkflowService.previewFolderTransfer(
				req.user,
				sourceProjectId,
				sourceFolderId,
				query.destinationProjectId,
			);
		} catch (e) {
			if (
				e instanceof ForbiddenError ||
				e instanceof BadRequestError ||
				e instanceof NotFoundError
			) {
				throw e;
			}

			if (e instanceof UserError) {
				throw new BadRequestError(e.message);
			}

			if (e instanceof FolderNotFoundError) throw new NotFoundError(e.message);
			throw e;
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
		await this.folderService.assertWorkflowFolder(sourceFolderId, sourceProjectId);

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
