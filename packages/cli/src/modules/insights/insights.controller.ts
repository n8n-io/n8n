//import type { InsightsSummary } from '@n8n/api-types';

import type { InsightsSummary } from '@n8n/api-types';

import { Get, RestController } from '@/decorators';

import { InsightsService } from './insights.service';

@RestController('/insights')
export class InsightsController {
	constructor(private readonly insightsService: InsightsService) {}

	@Get('/summary')
	async getInsightsSummary(): Promise<InsightsSummary> {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return await this.insightsService.getInsightsSummary();
	}
}
