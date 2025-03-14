import type { InsightsSummary } from '@n8n/api-types';

import { Get, RestController } from '@/decorators';

import { InsightsService } from './insights.service';

@RestController('/insights')
export class InsightsController {
	constructor(private readonly insightsService: InsightsService) {}

	@Get('/summary')
	async getInsightsSummary(): Promise<InsightsSummary> {
		// TODO: call service or repo to get the actual result

		return {
			averageRunTime: {
				value: 13,
				unit: 'time',
				deviation: 0,
			},
			failed: {
				value: 13,
				unit: 'count',
				deviation: 0,
			},
			failureRate: {
				value: 13,
				unit: 'ratio',
				deviation: 0,
			},
			timeSaved: {
				value: 13,
				unit: 'time',
				deviation: 0,
			},
			total: {
				value: 13,
				unit: 'count',
				deviation: 0,
			},
		};
	}
}
