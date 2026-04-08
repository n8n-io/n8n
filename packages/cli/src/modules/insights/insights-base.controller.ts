import type { InsightsDateFilterDto, ListInsightsWorkflowQueryDto } from '@n8n/api-types';
import { DateTime } from 'luxon';
import { UserError } from 'n8n-workflow';
import { z } from 'zod';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';

import type { InsightsService } from './insights.service';

export abstract class InsightsBaseController {
	protected abstract readonly insightsService: InsightsService;

	protected prepareDateFilters(query: InsightsDateFilterDto | ListInsightsWorkflowQueryDto): {
		startDate: Date;
		endDate: Date;
	} {
		this.validateQueryDates(query);
		const { startDate, endDate } = this.getSanitizedDateFilters(query);
		this.checkDatesFiltersAgainstLicense({ startDate, endDate });
		return { startDate, endDate };
	}

	private validateQueryDates(query: InsightsDateFilterDto | ListInsightsWorkflowQueryDto) {
		const schema = z
			.object({
				startDate: z.coerce.date().optional(),
				endDate: z.coerce.date().optional(),
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

	/**
	 * When the `startDate` is not provided, we default to the last 7 days.
	 * When the `endDate` is not provided, we default to today.
	 */
	private getSanitizedDateFilters(query: InsightsDateFilterDto | ListInsightsWorkflowQueryDto): {
		startDate: Date;
		endDate: Date;
	} {
		const today = new Date();

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
