import type {
	InsightsByTime,
	InsightsByWorkflow,
	InsightsSummary,
	RestrictedInsightsByTime,
} from '@n8n/api-types';
import { InsightsDateFilterDto, ListInsightsWorkflowQueryDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Get, Licensed, Param, ProjectScope, Query, RestController } from '@n8n/decorators';

import { InsightsBaseController } from './insights-base.controller';
import { InsightsService } from './insights.service';

@RestController('/insights/projects')
export class InsightsProjectController extends InsightsBaseController {
	constructor(protected readonly insightsService: InsightsService) {
		super();
	}

	@Get('/:projectId/summary')
	@ProjectScope('insights:list')
	async getProjectInsightsSummary(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId') projectId: string,
		@Query query: InsightsDateFilterDto = {},
	): Promise<InsightsSummary> {
		const { startDate, endDate } = this.prepareDateFilters(query);

		return await this.insightsService.getInsightsSummary({
			startDate,
			endDate,
			projectId,
		});
	}

	@Get('/:projectId/by-workflow')
	@ProjectScope('insights:list')
	@Licensed('feat:insights:viewDashboard')
	async getProjectInsightsByWorkflow(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId') projectId: string,
		@Query query: ListInsightsWorkflowQueryDto,
	): Promise<InsightsByWorkflow> {
		const { startDate, endDate } = this.prepareDateFilters(query);

		return await this.insightsService.getInsightsByWorkflow({
			skip: query.skip,
			take: query.take,
			sortBy: query.sortBy,
			projectId,
			startDate,
			endDate,
		});
	}

	@Get('/:projectId/by-time')
	@ProjectScope('insights:list')
	@Licensed('feat:insights:viewDashboard')
	async getProjectInsightsByTime(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId') projectId: string,
		@Query query: InsightsDateFilterDto,
	): Promise<InsightsByTime[]> {
		const { startDate, endDate } = this.prepareDateFilters(query);

		return (await this.insightsService.getInsightsByTime({
			projectId,
			startDate,
			endDate,
		})) as InsightsByTime[];
	}

	@Get('/:projectId/by-time/time-saved')
	@ProjectScope('insights:list')
	async getProjectTimeSavedInsightsByTime(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId') projectId: string,
		@Query query: InsightsDateFilterDto,
	): Promise<RestrictedInsightsByTime[]> {
		const { startDate, endDate } = this.prepareDateFilters(query);

		return (await this.insightsService.getInsightsByTime({
			insightTypes: ['time_saved_min'],
			projectId,
			startDate,
			endDate,
		})) as RestrictedInsightsByTime[];
	}
}
