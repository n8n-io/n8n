import { CreateAppDto, CreatePageDto, UpdateAppDto, UpdatePageDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import {
	Body,
	Delete,
	Get,
	Middleware,
	Param,
	Patch,
	Post,
	ProjectScope,
	RestController,
} from '@n8n/decorators';
import { NextFunction, Response } from 'express';

import { ConflictError } from '@/errors/response-errors/conflict.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { AttachableWorkflowsService } from '@/modules/agents/attachable-workflows.service';
import { InstanceWriteAccessService } from '@/services/instance-write-access.service';
import { ProjectService } from '@/services/project.service.ee';

import { AppsService } from './apps.service';
import { AppNamespaceConflictError } from './errors/app-namespace-conflict.error';
import { PageRouteConflictError } from './errors/page-route-conflict.error';

@RestController('/projects/:projectId/apps')
export class AppsController {
	constructor(
		private readonly appsService: AppsService,
		private readonly projectService: ProjectService,
		private readonly instanceWriteAccess: InstanceWriteAccessService,
		private readonly attachableWorkflowsService: AttachableWorkflowsService,
	) {}

	private checkInstanceWriteAccess(): void {
		if (this.instanceWriteAccess.isReadOnly()) {
			throw new ForbiddenError(
				'Cannot modify apps on a protected instance. This instance is in read-only mode.',
			);
		}
	}

	private handleAppError(e: unknown): never {
		if (e instanceof AppNamespaceConflictError || e instanceof PageRouteConflictError) {
			throw new ConflictError(e.message);
		}
		throw e;
	}

	@Middleware()
	async validateProjectExists(
		req: AuthenticatedRequest<{ projectId: string }>,
		res: Response,
		next: NextFunction,
	) {
		try {
			await this.projectService.getProject(req.params.projectId);
			next();
		} catch {
			res.status(404).send('Project not found');
		}
	}

	@Post('/')
	@ProjectScope('app:create')
	async createApp(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Body dto: CreateAppDto,
	) {
		this.checkInstanceWriteAccess();
		try {
			return await this.appsService.createApp(req.params.projectId, dto);
		} catch (e: unknown) {
			this.handleAppError(e);
		}
	}

	@Get('/')
	@ProjectScope('app:listProject')
	async listApps(req: AuthenticatedRequest<{ projectId: string }>, _res: Response) {
		return await this.appsService.listApps(req.params.projectId);
	}

	@Get('/:appId')
	@ProjectScope('app:read')
	async getApp(
		_req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('appId') appId: string,
	) {
		return await this.appsService.getApp(appId);
	}

	@Patch('/:appId')
	@ProjectScope('app:update')
	async updateApp(
		_req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('appId') appId: string,
		@Body dto: UpdateAppDto,
	) {
		this.checkInstanceWriteAccess();
		try {
			return await this.appsService.updateApp(appId, dto);
		} catch (e: unknown) {
			this.handleAppError(e);
		}
	}

	@Delete('/:appId')
	@ProjectScope('app:delete')
	async deleteApp(
		_req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('appId') appId: string,
	) {
		this.checkInstanceWriteAccess();
		await this.appsService.deleteApp(appId);
	}

	/** Workflows a page can set as its `dataWorkflowId` — same trigger-compatible list agents pick tools from. */
	@Get('/data-workflows')
	@ProjectScope('app:read')
	async listDataWorkflows(req: AuthenticatedRequest<{ projectId: string }>, _res: Response) {
		return await this.attachableWorkflowsService.list(req.user, req.params.projectId);
	}

	@Post('/:appId/pages')
	@ProjectScope('app:update')
	async createPage(
		_req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('appId') appId: string,
		@Body dto: CreatePageDto,
	) {
		this.checkInstanceWriteAccess();
		try {
			return await this.appsService.createPage(appId, dto);
		} catch (e: unknown) {
			this.handleAppError(e);
		}
	}

	@Get('/:appId/pages')
	@ProjectScope('app:read')
	async listPages(
		_req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('appId') appId: string,
	) {
		return await this.appsService.listPages(appId);
	}

	@Patch('/:appId/pages/:pageId')
	@ProjectScope('app:update')
	async updatePage(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('appId') appId: string,
		@Param('pageId') pageId: string,
		@Body dto: UpdatePageDto,
	) {
		this.checkInstanceWriteAccess();
		try {
			return await this.appsService.updatePage(appId, pageId, dto, req.user);
		} catch (e: unknown) {
			this.handleAppError(e);
		}
	}

	@Delete('/:appId/pages/:pageId')
	@ProjectScope('app:update')
	async deletePage(
		_req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('appId') appId: string,
		@Param('pageId') pageId: string,
	) {
		this.checkInstanceWriteAccess();
		await this.appsService.deletePage(appId, pageId);
	}
}
