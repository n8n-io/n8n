import type { InsightsSummary } from '@n8n/api-types';
import type {
	InsightsByTime,
	InsightsByWorkflow,
} from '@n8n/api-types/src/schemas/insights.schema';

import { Get, GlobalScope, RestController } from '@/decorators';
import { paginationListQueryMiddleware } from '@/middlewares/list-query/pagination';
import { sortByQueryMiddleware } from '@/middlewares/list-query/sort-by';
import { ListQuery } from '@/requests';

import { InsightsService } from './insights.service';
import type { InsightByWorkflowSortBy } from './repositories/insights-by-period.repository';
import { insightsByWorkflowSortingFields } from './repositories/insights-by-period.repository';

@RestController('/insights')
export class InsightsController {
	constructor(private readonly insightsService: InsightsService) {}

	@Get('/summary')
	@GlobalScope('insights:list')
	async getInsightsSummary(): Promise<InsightsSummary> {
		return await this.insightsService.getInsightsSummary();
	}

	// TODO: api test for this
	@Get('/by-workflow', { middlewares: [paginationListQueryMiddleware, sortByQueryMiddleware] })
	@GlobalScope('insights:list')
	async getInsightsByWorkflow(req: ListQuery.Options): Promise<InsightsByWorkflow> {
		let sortBy: InsightByWorkflowSortBy = 'total:asc'; // Provide a default value
		if (req.sortBy) {
			const sortByInfo = req.sortBy.split(':');
			if (
				insightsByWorkflowSortingFields.includes(sortByInfo[0]) &&
				['asc', 'desc'].includes(sortByInfo[1])
			) {
				sortBy = req.sortBy as InsightByWorkflowSortBy;
			}
		}

		return await this.insightsService.getInsightsByWorkflow({
			nbDays: 14, // TODO: extract into proper constant
			skip: req.skip,
			take: req.take,
			sortBy,
		});
	}

	@Get('/by-time')
	@GlobalScope('insights:list')
	async getInsightsByTime(): Promise<InsightsByTime[]> {
		return await this.insightsService.getInsightsByTime(14);
	}
}
