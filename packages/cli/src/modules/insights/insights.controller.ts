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
import { UserError } from 'n8n-workflow';
import { z } from 'zod';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';

import { keyRangeToDays } from './insights.constants';
import { InsightsService } from './insights.service';

@RestController('/insights')
export class InsightsController {
	constructor(private readonly insightsService: InsightsService) {}

	@Get('/summary')
	@GlobalScope('insights:list')
	async getInsightsSummary(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query query: InsightsDateFilterDto = { dateRange: 'week' },
	): Promise<InsightsSummary> {
		const { startDate, endDate } = this.prepareDateFilters(query);

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
		const { startDate, endDate } = this.prepareDateFilters(query);

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
		const { startDate, endDate } = this.prepareDateFilters(query);

		// Cast to full insights by time type
		// as the service returns all types by default
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
		const { startDate, endDate } = this.prepareDateFilters(query);

		// Cast to restricted insights by time type
		// as the service returns only time saved data
		return (await this.insightsService.getInsightsByTime({
			insightTypes: ['time_saved_min'],
			projectId: query.projectId,
			startDate,
			endDate,
		})) as RestrictedInsightsByTime[];
	}

	private validateQueryDates(query: InsightsDateFilterDto | ListInsightsWorkflowQueryDto) {
		// For backward compatibility, skip validation
		// when dateRange is provided the new `startDate` and `endDate` query are ignored
		if (query.dateRange) {
			return;
		}

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

		const result = schema.safeParse(query);
		if (!result.success) {
			throw new BadRequestError(result.error.errors.map(({ message }) => message).join(' '));
		}
	}

	private prepareDateFilters(query: InsightsDateFilterDto | ListInsightsWorkflowQueryDto): {
		startDate: Date;
		endDate: Date;
	} {
		this.validateQueryDates(query);
		const { startDate, endDate } = this.getSanitizedDateFilters(query);
		this.checkDatesFiltersAgainstLicense({ startDate, endDate });
		return { startDate, endDate };
	}

	/**
	 * When the `startDate` is not provided, we default to the last 7 days.
	 * When the `endDate` is not provided, we default to today.
	 */
	private getSanitizedDateFilters(query: InsightsDateFilterDto | ListInsightsWorkflowQueryDto): {
		startDate: Date;
		endDate: Date;
	} {
		const today = new Date();

		// For backward compatibility, if dateRange is provided it will take precedence over startDate and endDate
		if (query.dateRange) {
			const maxAgeInDays = keyRangeToDays[query.dateRange];
			return {
				startDate:
					maxAgeInDays === 1
						? DateTime.now().startOf('day').toJSDate()
						: DateTime.now().minus({ days: maxAgeInDays }).toJSDate(),
				endDate: today,
			};
		}

		if (!query.startDate) {
			return {
				startDate: DateTime.now().minus({ days: 7 }).toJSDate(),
				endDate: today,
			};
		}

		return { startDate: query.startDate, endDate: query.endDate ?? today };
	}

	private checkDatesFiltersAgainstLicense(dateFilters: { startDate: Date; endDate: Date }) {
		try {
			this.insightsService.validateDateFiltersLicense(dateFilters);
		} catch (error: unknown) {
			if (error instanceof UserError) {
				throw new ForbiddenError(error.message);
			}

			throw new InternalServerError();
		}
	}
}
