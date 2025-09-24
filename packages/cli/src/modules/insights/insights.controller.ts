import type {
	InsightsByTime,
	InsightsByWorkflow,
	InsightsSummary,
	RestrictedInsightsByTime,
} from '@n8n/api-types';
import { InsightsDateFilterDto, ListInsightsWorkflowQueryDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Get, GlobalScope, Licensed, Query, RestController } from '@n8n/decorators';
import { DateTime } from 'luxon';
import type { UserError } from 'n8n-workflow';
import { z } from 'zod';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

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
		@Query query: InsightsDateFilterDto = { dateRange: 'week' },
	): Promise<InsightsSummary> {
		this.validateStartEndDate(query);
		this.getMaxAgeInDaysAndGranularity(query);

		return await this.insightsService.getInsightsSummary({
			startDate: query.startDate ?? this.getDefaultStartDate(query),
			endDate: query.endDate,
			projectId: query.projectId,
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
		this.validateStartEndDate(payload);
		const dateRangeAndMaxAgeInDays = this.getMaxAgeInDaysAndGranularity({
			dateRange: payload.dateRange ?? 'week',
		});
		return await this.insightsService.getInsightsByWorkflow({
			maxAgeInDays: dateRangeAndMaxAgeInDays.maxAgeInDays,
			skip: payload.skip,
			take: payload.take,
			sortBy: payload.sortBy,
			projectId: payload.projectId,
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
		this.validateStartEndDate(payload);
		const dateRangeAndMaxAgeInDays = this.getMaxAgeInDaysAndGranularity(payload);

		// Cast to full insights by time type
		// as the service returns all types by default
		return (await this.insightsService.getInsightsByTime({
			maxAgeInDays: dateRangeAndMaxAgeInDays.maxAgeInDays,
			periodUnit: dateRangeAndMaxAgeInDays.granularity,
			projectId: payload.projectId,
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
		this.validateStartEndDate(payload);
		const dateRangeAndMaxAgeInDays = this.getMaxAgeInDaysAndGranularity(payload);

		// Cast to restricted insights by time type
		// as the service returns only time saved data
		return (await this.insightsService.getInsightsByTime({
			maxAgeInDays: dateRangeAndMaxAgeInDays.maxAgeInDays,
			periodUnit: dateRangeAndMaxAgeInDays.granularity,
			insightTypes: ['time_saved_min'],
			projectId: payload.projectId,
		})) as RestrictedInsightsByTime[];
	}

	private validateStartEndDate(payload: InsightsDateFilterDto | ListInsightsWorkflowQueryDto) {
		// TODO: allow the endDate to be empty. When startDate is not provided we'll consider that endDate is now
		// TODO: validate that the startDate is in the past

		const schema = z
			.object({
				startDate: z.coerce.date().optional(),
				endDate: z.coerce.date().optional(),
			})
			.refine(
				(data) => {
					if (data.startDate) {
						return data.endDate && data.startDate <= data.endDate;
					}
					return true;
				},
				{
					message:
						'endDate is required and must be after or equal to startDate when startDate is provided',
					path: ['endDate'],
				},
			);

		const result = schema.safeParse(payload);
		if (!result.success) {
			throw new BadRequestError(result.error.errors.map(({ message }) => message).join(' '));
		}
	}

	private getDefaultStartDate(query: InsightsDateFilterDto) {
		if (query.dateRange) {
			const dateRangeAndMaxAgeInDays = this.getMaxAgeInDaysAndGranularity(query);
			return DateTime.now()
				.minus({ days: dateRangeAndMaxAgeInDays.maxAgeInDays })
				.startOf('day')
				.toJSDate();
		}

		return DateTime.now().minus({ days: 7 }).startOf('day').toJSDate();
	}
}
