import { InsightsDateFilterDto, ListInsightsWorkflowQueryDto } from '@n8n/api-types';
import type { InsightsSummary, InsightsByTime, InsightsByWorkflow } from '@n8n/api-types';
import type { RestrictedInsightsByTime } from '@n8n/api-types/src/schemas/insights.schema';
import { AuthenticatedRequest } from '@n8n/db';
import { Get, GlobalScope, Licensed, Query, RestController } from '@n8n/decorators';
import type { UserError } from 'n8n-workflow';

import { InsightsService } from './insights.service';

export class ForbiddenError extends Error {
	readonly httpStatusCode = 403;

	readonly errorCode = 403;

	readonly shouldReport = false;
}

@RestController('/insights')
export class InsightsController {
	constructor(private readonly insightsService: InsightsService) {}

	/**
	 * This method is used to transform the date range from the request payload into a maximum age in days.
	 * It throws a ForbiddenError if the date range does not match the license insights max history
	 */
	private getMaxAgeInDaysAndGranularity(payload: InsightsDateFilterDto) {
		try {
			return this.insightsService.getMaxAgeInDaysAndGranularity(payload.dateRange ?? 'week');
		} catch (error: unknown) {
			throw new ForbiddenError((error as UserError).message);
		}
	}

	@Get('/summary')
	@GlobalScope('insights:list')
	async getInsightsSummary(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query payload: InsightsDateFilterDto = { dateRange: 'week' },
	): Promise<InsightsSummary> {
		const dateRangeAndMaxAgeInDays = this.getMaxAgeInDaysAndGranularity(payload);
		return await this.insightsService.getInsightsSummary({
			periodLengthInDays: dateRangeAndMaxAgeInDays.maxAgeInDays,
		});
	}

	@Get('/by-workflow')
	@GlobalScope('insights:list')
	@Licensed('feat:insights:viewDashboard')
	async getInsightsByWorkflow(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query payload: ListInsightsWorkflowQueryDto,
	): Promise<InsightsByWorkflow> {
		const dateRangeAndMaxAgeInDays = this.getMaxAgeInDaysAndGranularity({
			dateRange: payload.dateRange ?? 'week',
		});
		return await this.insightsService.getInsightsByWorkflow({
			maxAgeInDays: dateRangeAndMaxAgeInDays.maxAgeInDays,
			skip: payload.skip,
			take: payload.take,
			sortBy: payload.sortBy,
		});
	}

	@Get('/by-time')
	@GlobalScope('insights:list')
	@Licensed('feat:insights:viewDashboard')
	async getInsightsByTime(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query payload: InsightsDateFilterDto,
	): Promise<InsightsByTime[]> {
		const dateRangeAndMaxAgeInDays = this.getMaxAgeInDaysAndGranularity(payload);

		// Cast to full insights by time type
		// as the service returns all types by default
		return (await this.insightsService.getInsightsByTime({
			maxAgeInDays: dateRangeAndMaxAgeInDays.maxAgeInDays,
			periodUnit: dateRangeAndMaxAgeInDays.granularity,
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
		@Query payload: InsightsDateFilterDto,
	): Promise<RestrictedInsightsByTime[]> {
		const dateRangeAndMaxAgeInDays = this.getMaxAgeInDaysAndGranularity(payload);

		// Cast to restricted insights by time type
		// as the service returns only time saved data
		return (await this.insightsService.getInsightsByTime({
			maxAgeInDays: dateRangeAndMaxAgeInDays.maxAgeInDays,
			periodUnit: dateRangeAndMaxAgeInDays.granularity,
			insightTypes: ['time_saved_min'],
		})) as RestrictedInsightsByTime[];
	}
}
