import { CreateProjectDto, CreateWorkspaceDto, UpdateWorkspaceAccessDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import {
	Body,
	Get,
	GlobalScope,
	Param,
	Patch,
	Post,
	ProjectScope,
	RestController,
} from '@n8n/decorators';
import { BadRequestError } from '@n8n/errors';
import { Response } from 'express';

import { TeamProjectOverQuotaError } from '@/services/project.service.ee';

import { WorkspacesService } from './workspaces.service';

/** PROTOTYPE (workspaces) */
@RestController('/workspaces')
export class WorkspacesController {
	constructor(private readonly workspacesService: WorkspacesService) {}

	/** The workspaces the user can see. The list depends on the user, so no scope gates it. */
	@Get('/')
	async list(req: AuthenticatedRequest) {
		return await this.workspacesService.list(req.user);
	}

	@Post('/')
	@GlobalScope('project:create')
	async create(req: AuthenticatedRequest, _res: Response, @Body payload: CreateWorkspaceDto) {
		return await this.workspacesService.create(req.user, payload);
	}

	/** Anyone can join a public workspace. The service checks the rest. */
	@Post('/:workspaceId/join')
	async join(req: AuthenticatedRequest, _res: Response, @Param('workspaceId') workspaceId: string) {
		await this.workspacesService.join(req.user, workspaceId);
		return { success: true };
	}

	@Post('/:workspaceId/leave')
	async leave(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('workspaceId') workspaceId: string,
	) {
		await this.workspacesService.leave(req.user, workspaceId);
		return { success: true };
	}

	@Patch('/:projectId/access')
	@ProjectScope('project:update')
	async updateAccess(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId') workspaceId: string,
		@Body payload: UpdateWorkspaceAccessDto,
	) {
		await this.workspacesService.updateAccess(workspaceId, payload);
		return { success: true };
	}

	@Post('/:projectId/projects')
	@ProjectScope('project:read')
	async createProject(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId') workspaceId: string,
		@Body payload: CreateProjectDto,
	) {
		try {
			return await this.workspacesService.createProject(req.user, workspaceId, payload);
		} catch (e) {
			if (e instanceof TeamProjectOverQuotaError) throw new BadRequestError(e.message);
			throw e;
		}
	}
}
