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

import { keyRangeToDays } from './insights.constants';
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
		const { startDate, endDate } = this.getDefaultDateFilters(query);
		this.validateStartEndDate(query);
		this.getMaxAgeInDaysAndGranularity(query);

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

	private validateStartEndDate(dateFilters: { startDate?: Date; endDate?: Date }) {
		const inThePast = (date?: Date) => !date || date <= new Date();
		const dateInThePastSchema = z.coerce
			.date()
			.optional()
			.refine(inThePast, { message: 'must be in the past' });

		const schema = z
			.object({
				startDate: dateInThePastSchema,
				endDate: dateInThePastSchema,
			})
			.refine(
				(data) => {
					if (data.startDate && data.endDate) {
						return data.startDate <= data.endDate;
					}
					return true;
				},
				{
					message: 'endDate must be the same as or after startDate',
					path: ['endDate'],
				},
			);

		const result = schema.safeParse(dateFilters);
		if (!result.success) {
			throw new BadRequestError(result.error.errors.map(({ message }) => message).join(' '));
		}
	}

	/**
	 * When the `startDate` is not provided, we default to the last 7 days.
	 * When the `endDate` is not provided, we default to today.
	 */
	private getDefaultDateFilters(query: InsightsDateFilterDto): { startDate: Date; endDate: Date } {
		const today = DateTime.now().startOf('day').toJSDate();

		// For backward compatibility, if dateRange is provided it will take precedence over startDate and endDate
		if (query.dateRange) {
			const maxAgeInDays = keyRangeToDays[query.dateRange];
			return {
				startDate: DateTime.now().minus({ days: maxAgeInDays }).startOf('day').toJSDate(),
				endDate: today,
			};
		}

		if (!query.startDate) {
			return {
				startDate: DateTime.now().minus({ days: 7 }).startOf('day').toJSDate(),
				endDate: today,
			};
		}

		return { startDate: query.startDate, endDate: query.endDate ?? today };
	}
}
