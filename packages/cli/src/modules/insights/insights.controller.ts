import type {
	InsightsByTime,
	InsightsByWorkflow,
	InsightsSummary,
	RestrictedInsightsByTime,
} from '@n8n/api-types';
import { InsightsDateFilterDto, ListInsightsWorkflowQueryDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Get, GlobalScope, Licensed, Query, RestController } from '@n8n/decorators';

import { InsightsDateFilterService } from './insights-date-filter.service';
import { InsightsService } from './insights.service';

@RestController('/insights')
export class InsightsController {
	constructor(
		private readonly insightsService: InsightsService,
		private readonly dateFilterService: InsightsDateFilterService,
	) {}

	@Get('/summary')
	@GlobalScope('insights:list')
	async getInsightsSummary(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query query: InsightsDateFilterDto = {},
	): Promise<InsightsSummary> {
		const { startDate, endDate } = this.dateFilterService.prepareDateFilters(query);

		return await this.insightsService.getInsightsSummary({
			startDate,
			endDate,
			projectId: query.projectId,
		});
	}

	@Get('/by-workflow')
	@GlobalScope('insights:list')
	@Licensed('feat:insights:viewDashboard')
	async getInsightsByWorkflow(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query query: ListInsightsWorkflowQueryDto,
	): Promise<InsightsByWorkflow> {
		const { startDate, endDate } = this.dateFilterService.prepareDateFilters(query);

		return await this.insightsService.getInsightsByWorkflow({
			skip: query.skip,
			take: query.take,
			sortBy: query.sortBy,
			projectId: query.projectId,
			startDate,
			endDate,
		});
	}

	@Get('/by-time')
	@GlobalScope('insights:list')
	@Licensed('feat:insights:viewDashboard')
	async getInsightsByTime(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query query: InsightsDateFilterDto,
	): Promise<InsightsByTime[]> {
		const { startDate, endDate } = this.dateFilterService.prepareDateFilters(query);

		return (await this.insightsService.getInsightsByTime({
			projectId: query.projectId,
			startDate,
			endDate,
		})) as InsightsByTime[];
	}

	/**
	 * This endpoint is used to get the time saved insights by time.
	 * time data for time saved insights is not restricted by the license
	 */
	@Get('/by-time/time-saved')
	@GlobalScope('insights:list')
	async getTimeSavedInsightsByTime(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query query: InsightsDateFilterDto,
	): Promise<RestrictedInsightsByTime[]> {
		const { startDate, endDate } = this.dateFilterService.prepareDateFilters(query);

		return (await this.insightsService.getInsightsByTime({
			insightTypes: ['time_saved_min'],
			projectId: query.projectId,
			startDate,
			endDate,
		})) as RestrictedInsightsByTime[];
	}
}
