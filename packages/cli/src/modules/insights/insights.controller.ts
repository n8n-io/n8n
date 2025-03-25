import type { InsightsSummary } from '@n8n/api-types';
import { ListInsightsWorkflowQueryDto } from '@n8n/api-types';
import type {
	InsightsByTime,
	InsightsByWorkflow,
} from '@n8n/api-types/src/schemas/insights.schema';

import { Get, GlobalScope, Query, RestController } from '@/decorators';
import { paginationListQueryMiddleware } from '@/middlewares/list-query/pagination';
import { sortByQueryMiddleware } from '@/middlewares/list-query/sort-by';
import { AuthenticatedRequest } from '@/requests';

import { InsightsService } from './insights.service';

@RestController('/insights')
export class InsightsController {
	private readonly nbDaysFilteredInsights = 14;

	constructor(private readonly insightsService: InsightsService) {}

	@Get('/summary')
	@GlobalScope('insights:list')
	async getInsightsSummary(): Promise<InsightsSummary> {
		return await this.insightsService.getInsightsSummary();
	}

	@Get('/by-workflow', { middlewares: [paginationListQueryMiddleware, sortByQueryMiddleware] })
	@GlobalScope('insights:list')
	async getInsightsByWorkflow(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query payload: ListInsightsWorkflowQueryDto,
	): Promise<InsightsByWorkflow> {
		return await this.insightsService.getInsightsByWorkflow({
			nbDays: this.nbDaysFilteredInsights,
			skip: payload.skip,
			take: payload.take,
			sortBy: payload.sortBy,
		});
	}

	@Get('/by-time')
	@GlobalScope('insights:list')
	async getInsightsByTime(): Promise<InsightsByTime[]> {
		return await this.insightsService.getInsightsByTime(this.nbDaysFilteredInsights);
	}
}
