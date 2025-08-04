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
} from '@n8n/decorators';
import { Response } from 'express';
import { UserError } from 'n8n-workflow';

import { FolderNotFoundError } from '@/errors/folder-not-found.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { FolderService } from '@/services/folder.service';
import { EnterpriseWorkflowService } from '@/workflows/workflow.service.ee';

@RestController('/projects/:projectId/folders')
export class ProjectController {
	constructor(
		private readonly folderService: FolderService,
		private readonly enterpriseWorkflowService: EnterpriseWorkflowService,
	) {}

	@Post('/')
	@ProjectScope('folder:create')
	@Licensed('feat:folders')
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

	@Get('/:folderId')
	@ProjectScope('folder:read')
	@Licensed('feat:folders')
	async getFolder(req: AuthenticatedRequest<{ projectId: string; folderId: string }>) {
		const { projectId, folderId } = req.params;

		try {
			const folder = await this.folderService.findFolderInProjectOrFail(folderId, projectId);
			return folder;
		} catch (e) {
			if (e instanceof FolderNotFoundError) {
				throw new NotFoundError(e.message);
			}
			throw new InternalServerError(undefined, e);
		}
	}

	@Get('/:folderId/path')
	@ProjectScope('folder:read')
	@Licensed('feat:folders')
	async getFolderPath(req: AuthenticatedRequest<{ projectId: string; folderId: string }>) {
		const { projectId, folderId } = req.params;

		try {
			const path = await this.folderService.getFolderPath(folderId, projectId);
			return { path };
		} catch (e) {
			if (e instanceof FolderNotFoundError) {
				throw new NotFoundError(e.message);
			}
			throw new InternalServerError(undefined, e);
		}
	}

	@Get('/:folderId/ancestors')
	@ProjectScope('folder:read')
	@Licensed('feat:folders')
	async getFolderAncestors(req: AuthenticatedRequest<{ projectId: string; folderId: string }>) {
		const { projectId, folderId } = req.params;

		try {
			const ancestors = await this.folderService.getFolderAncestors(folderId, projectId);
			return { ancestors };
		} catch (e) {
			if (e instanceof FolderNotFoundError) {
				throw new NotFoundError(e.message);
			}
			throw new InternalServerError(undefined, e);
		}
	}

	@Get('/:folderId/descendants')
	@ProjectScope('folder:read')
	@Licensed('feat:folders')
	async getFolderDescendants(req: AuthenticatedRequest<{ projectId: string; folderId: string }>) {
		const { projectId, folderId } = req.params;

		try {
			const descendants = await this.folderService.getFolderDescendants(folderId, projectId);
			return { descendants };
		} catch (e) {
			if (e instanceof FolderNotFoundError) {
				throw new NotFoundError(e.message);
			}
			throw new InternalServerError(undefined, e);
		}
	}

	@Post('/:folderId/duplicate')
	@ProjectScope('folder:create')
	@Licensed('feat:folders')
	async duplicateFolder(
		req: AuthenticatedRequest<{ projectId: string; folderId: string }>,
		_res: Response,
		@Body payload: { name?: string; parentFolderId?: string; includeWorkflows?: boolean },
	) {
		const { projectId, folderId } = req.params;
		const { name, parentFolderId, includeWorkflows = false } = payload;

		try {
			const duplicatedFolder = await this.folderService.duplicateFolder(folderId, projectId, {
				name,
				parentFolderId,
				includeWorkflows,
			});
			return duplicatedFolder;
		} catch (e) {
			if (e instanceof FolderNotFoundError) {
				throw new NotFoundError(e.message);
			} else if (e instanceof UserError) {
				throw new BadRequestError(e.message);
			}
			throw new InternalServerError(undefined, e);
		}
	}

	@Post('/bulk/move')
	@ProjectScope('folder:update')
	@Licensed('feat:folders')
	async bulkMoveFolders(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Body payload: { folderIds: string[]; targetFolderId?: string },
	) {
		const { projectId } = req.params;
		const { folderIds, targetFolderId } = payload;

		if (!folderIds || folderIds.length === 0) {
			throw new BadRequestError('folderIds is required and cannot be empty');
		}

		if (folderIds.length > 50) {
			throw new BadRequestError('Cannot move more than 50 folders at once');
		}

		try {
			const result = await this.folderService.bulkMoveFolders(folderIds, projectId, targetFolderId);
			return result;
		} catch (e) {
			if (e instanceof FolderNotFoundError) {
				throw new NotFoundError(e.message);
			} else if (e instanceof UserError) {
				throw new BadRequestError(e.message);
			}
			throw new InternalServerError(undefined, e);
		}
	}

	@Post('/bulk/delete')
	@ProjectScope('folder:delete')
	@Licensed('feat:folders')
	async bulkDeleteFolders(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Body payload: { folderIds: string[]; transferToFolderId?: string },
	) {
		const { projectId } = req.params;
		const { folderIds, transferToFolderId } = payload;

		if (!folderIds || folderIds.length === 0) {
			throw new BadRequestError('folderIds is required and cannot be empty');
		}

		if (folderIds.length > 50) {
			throw new BadRequestError('Cannot delete more than 50 folders at once');
		}

		try {
			const result = await this.folderService.bulkDeleteFolders(
				req.user,
				folderIds,
				projectId,
				transferToFolderId,
			);
			return result;
		} catch (e) {
			if (e instanceof FolderNotFoundError) {
				throw new NotFoundError(e.message);
			} else if (e instanceof UserError) {
				throw new BadRequestError(e.message);
			}
			throw new InternalServerError(undefined, e);
		}
	}

	@Get('/:folderId/permissions')
	@ProjectScope('folder:read')
	@Licensed('feat:folders')
	async getFolderPermissions(req: AuthenticatedRequest<{ projectId: string; folderId: string }>) {
		const { projectId, folderId } = req.params;

		try {
			const permissions = await this.folderService.getFolderPermissions(
				req.user,
				folderId,
				projectId,
			);
			return { permissions };
		} catch (e) {
			if (e instanceof FolderNotFoundError) {
				throw new NotFoundError(e.message);
			}
			throw new InternalServerError(undefined, e);
		}
	}

	@Get('/:folderId/statistics')
	@ProjectScope('folder:read')
	@Licensed('feat:folders')
	async getFolderStatistics(req: AuthenticatedRequest<{ projectId: string; folderId: string }>) {
		const { projectId, folderId } = req.params;

		try {
			const statistics = await this.folderService.getFolderStatistics(folderId, projectId);
			return statistics;
		} catch (e) {
			if (e instanceof FolderNotFoundError) {
				throw new NotFoundError(e.message);
			}
			throw new InternalServerError(undefined, e);
		}
	}
}
