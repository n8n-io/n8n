import type {
	InsightsByTime,
	InsightsByWorkflow,
	InsightsSummary,
	RestrictedInsightsByTime,
} from '@n8n/api-types';
import { InsightsProjectDateFilterDto, ListInsightsProjectWorkflowQueryDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import {
	Get,
	Licensed,
	Middleware,
	Param,
	ProjectScope,
	Query,
	RestController,
} from '@n8n/decorators';
import type { NextFunction, Response } from 'express';

import { ProjectService } from '@/services/project.service.ee';

import { InsightsDateFilterService } from './insights-date-filter.service';
import { InsightsService } from './insights.service';

@RestController('/projects/:projectId/insights')
export class InsightsProjectController {
	constructor(
		private readonly insightsService: InsightsService,
		private readonly dateFilterService: InsightsDateFilterService,
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
			return;
		}
	}

	@Get('/summary')
	@ProjectScope('insights:list')
	async getProjectInsightsSummary(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId') projectId: string,
		@Query query: InsightsProjectDateFilterDto = {},
	): Promise<InsightsSummary> {
		const { startDate, endDate } = this.dateFilterService.prepareDateFilters(query);

		return await this.insightsService.getInsightsSummary({
			startDate,
			endDate,
			projectId,
		});
	}

	@Get('/by-workflow')
	@ProjectScope('insights:list')
	@Licensed('feat:insights:viewDashboard')
	async getProjectInsightsByWorkflow(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId') projectId: string,
		@Query query: ListInsightsProjectWorkflowQueryDto,
	): Promise<InsightsByWorkflow> {
		const { startDate, endDate } = this.dateFilterService.prepareDateFilters(query);

		return await this.insightsService.getInsightsByWorkflow({
			skip: query.skip,
			take: query.take,
			sortBy: query.sortBy,
			projectId,
			startDate,
			endDate,
		});
	}

	@Get('/by-time')
	@ProjectScope('insights:list')
	@Licensed('feat:insights:viewDashboard')
	async getProjectInsightsByTime(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId') projectId: string,
		@Query query: InsightsProjectDateFilterDto,
	): Promise<InsightsByTime[]> {
		const { startDate, endDate } = this.dateFilterService.prepareDateFilters(query);

		return (await this.insightsService.getInsightsByTime({
			projectId,
			startDate,
			endDate,
		})) as InsightsByTime[];
	}

	@Get('/by-time/time-saved')
	@ProjectScope('insights:list')
	async getProjectTimeSavedInsightsByTime(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId') projectId: string,
		@Query query: InsightsProjectDateFilterDto,
	): Promise<RestrictedInsightsByTime[]> {
		const { startDate, endDate } = this.dateFilterService.prepareDateFilters(query);

		return (await this.insightsService.getInsightsByTime({
			insightTypes: ['time_saved_min'],
			projectId,
			startDate,
			endDate,
		})) as RestrictedInsightsByTime[];
	}
}
