import { InsightsSummaryPublicDto, InsightsSummaryQueryPublicDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import {
	ApiDescription,
	ApiKeyScope,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Get,
	PublicApiController,
	Query,
} from '@n8n/decorators';
import type { Response } from 'express';
import { DateTime } from 'luxon';
import { UserError } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { InsightsService } from '@/modules/insights/insights.service';

@PublicApiController('/insights')
export class InsightsPublicController {
	constructor(private readonly insightsService: InsightsService) {}

	@Get('/summary')
	@ApiKeyScope('insights:read')
	@ApiSummary('Retrieve insights summary')
	@ApiDescription('Retrieve the insights summary for the selected date range.')
	@ApiTags(['Insights'])
	@ApiResponse(200, InsightsSummaryPublicDto)
	async getInsightsSummary(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: InsightsSummaryQueryPublicDto,
	): Promise<InsightsSummaryPublicDto> {
		const endDate = query.endDate ? new Date(query.endDate) : new Date();
		const startDate = query.startDate
			? new Date(query.startDate)
			: DateTime.now().minus({ days: 7 }).toJSDate();

		if (query.startDate && query.endDate && startDate > endDate) {
			throw new BadRequestError('endDate must be the same as or after startDate');
		}

		try {
			this.insightsService.validateDateFiltersLicense({ startDate, endDate });
		} catch (error) {
			if (error instanceof UserError) {
				throw new ForbiddenError(error.message);
			}

			throw error;
		}

		return await this.insightsService.getInsightsSummary({
			user: req.user,
			startDate,
			endDate,
			projectId: query.projectId,
		});
	}
}
