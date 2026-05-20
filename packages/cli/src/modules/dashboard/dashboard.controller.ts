import {
	CreateDashboardDto,
	ExecuteDashboardActionDto,
	ListDashboardsQueryDto,
	ShareDashboardDto,
	UnshareDashboardDto,
	UpdateDashboardDto,
} from '@n8n/api-types';
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
	Query,
	RestController,
} from '@n8n/decorators';
import { NextFunction, Response } from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { ProjectService } from '@/services/project.service.ee';

import { DashboardActionService } from './dashboard-action.service';
import { DashboardService } from './dashboard.service';
import { DashboardActionNotFoundError } from './errors/dashboard-action-not-found.error';
import { DashboardConflictError } from './errors/dashboard-conflict.error';
import { DashboardNameConflictError } from './errors/dashboard-name-conflict.error';
import { DashboardNotFoundError } from './errors/dashboard-not-found.error';
import { DashboardValidationError } from './errors/dashboard-validation.error';

@RestController('/projects/:projectId/dashboards')
export class DashboardController {
	constructor(
		private readonly dashboardService: DashboardService,
		private readonly dashboardActionService: DashboardActionService,
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
		} catch {
			res.status(404).send('Project not found');
		}
	}

	@Post('/')
	@ProjectScope('dashboard:create')
	async createDashboard(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Body dto: CreateDashboardDto,
	) {
		try {
			return await this.dashboardService.createDashboard(req.params.projectId, dto);
		} catch (e) {
			this.handleError(e);
		}
	}

	@Get('/')
	@ProjectScope('dashboard:listProject')
	async listDashboards(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Query payload: ListDashboardsQueryDto,
	) {
		const providedFilter = payload?.filter ?? {};
		return await this.dashboardService.getManyAndCount({
			...payload,
			filter: { ...providedFilter, projectId: req.params.projectId },
		});
	}

	@Get('/:dashboardId')
	@ProjectScope('dashboard:read')
	async getDashboard(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('dashboardId') dashboardId: string,
	) {
		try {
			return await this.dashboardService.getDashboard(dashboardId, req.params.projectId);
		} catch (e) {
			this.handleError(e);
		}
	}

	@Patch('/:dashboardId')
	@ProjectScope('dashboard:update')
	async updateDashboard(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('dashboardId') dashboardId: string,
		@Body dto: UpdateDashboardDto,
	) {
		try {
			return await this.dashboardService.updateDashboard(dashboardId, req.params.projectId, dto);
		} catch (e) {
			this.handleError(e);
		}
	}

	@Delete('/:dashboardId')
	@ProjectScope('dashboard:delete')
	async deleteDashboard(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('dashboardId') dashboardId: string,
	) {
		try {
			return await this.dashboardService.deleteDashboard(dashboardId, req.params.projectId);
		} catch (e) {
			this.handleError(e);
		}
	}

	@Post('/:dashboardId/share')
	@ProjectScope('dashboard:share')
	async shareDashboard(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('dashboardId') dashboardId: string,
		@Body dto: ShareDashboardDto,
	) {
		try {
			return await this.dashboardService.shareDashboard(
				dashboardId,
				req.params.projectId,
				dto.shareWithIds,
				dto.role,
			);
		} catch (e) {
			this.handleError(e);
		}
	}

	@Post('/:dashboardId/unshare')
	@ProjectScope('dashboard:unshare')
	async unshareDashboard(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('dashboardId') dashboardId: string,
		@Body dto: UnshareDashboardDto,
	) {
		try {
			return await this.dashboardService.unshareDashboard(
				dashboardId,
				req.params.projectId,
				dto.userId,
			);
		} catch (e) {
			this.handleError(e);
		}
	}

	@Post('/:dashboardId/actions/:slug')
	@ProjectScope('dashboard:execute')
	async executeAction(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('dashboardId') dashboardId: string,
		@Param('slug') slug: string,
		@Body dto: ExecuteDashboardActionDto,
	) {
		try {
			return await this.dashboardActionService.executeAction(
				dashboardId,
				req.params.projectId,
				slug,
				dto,
			);
		} catch (e) {
			this.handleError(e);
		}
	}

	private handleError(e: unknown): never {
		if (e instanceof DashboardNotFoundError) {
			throw new NotFoundError(e.message);
		}
		if (e instanceof DashboardActionNotFoundError) {
			throw new NotFoundError(e.message);
		}
		if (e instanceof DashboardConflictError) {
			throw new ConflictError(e.message);
		}
		if (e instanceof DashboardNameConflictError) {
			throw new ConflictError(e.message);
		}
		if (e instanceof DashboardValidationError) {
			throw new BadRequestError(e.message);
		}
		if (e instanceof Error) {
			throw new InternalServerError(e.message, e);
		}
		throw e;
	}
}
