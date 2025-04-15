import { ListInsightsWorkflowQueryDto } from '@n8n/api-types';
import type { InsightsSummary, InsightsByTime, InsightsByWorkflow } from '@n8n/api-types';

import { Get, GlobalScope, Licensed, Query, RestController } from '@/decorators';
import { paginationListQueryMiddleware } from '@/middlewares/list-query/pagination';
import { sortByQueryMiddleware } from '@/middlewares/list-query/sort-by';
import { AuthenticatedRequest } from '@/requests';

import { InsightsService } from './insights.service';

@RestController('/insights')
export class InsightsController {
	private readonly maxAgeInDaysFilteredInsights = 7;

	constructor(private readonly insightsService: InsightsService) {}

	@Get('/summary')
	@GlobalScope('insights:list')
	async getInsightsSummary(): Promise<InsightsSummary> {
		return await this.insightsService.getInsightsSummary({
			periodLengthInDays: this.maxAgeInDaysFilteredInsights,
		});
	}

	@Get('/by-workflow', { middlewares: [paginationListQueryMiddleware, sortByQueryMiddleware] })
	@GlobalScope('insights:list')
	@Licensed('feat:insights:viewDashboard')
	async getInsightsByWorkflow(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query payload: ListInsightsWorkflowQueryDto,
	): Promise<InsightsByWorkflow> {
		return await this.insightsService.getInsightsByWorkflow({
			maxAgeInDays: this.maxAgeInDaysFilteredInsights,
			skip: payload.skip,
			take: payload.take,
			sortBy: payload.sortBy,
		});
	}

	@Get('/by-time')
	@GlobalScope('insights:list')
	@Licensed('feat:insights:viewDashboard')
	async getInsightsByTime(): Promise<InsightsByTime[]> {
		return await this.insightsService.getInsightsByTime({
			maxAgeInDays: this.maxAgeInDaysFilteredInsights,
			periodUnit: 'day',
		});
	}
}
