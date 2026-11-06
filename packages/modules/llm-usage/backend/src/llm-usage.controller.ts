import {
	LlmUsageCallsQueryDto,
	LlmUsageQueryDto,
	type LlmUsageCallsResponse,
	type LlmUsageSummaryResponse,
} from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Get, GlobalScope, Query, RestController } from '@n8n/decorators';

import { LlmUsageService } from './llm-usage.service';

@RestController('/llm-usage')
export class LlmUsageController {
	constructor(private readonly llmUsageService: LlmUsageService) {}

	@Get('/summary')
	@GlobalScope('llmUsage:read')
	async getSummary(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query query: LlmUsageQueryDto,
	): Promise<LlmUsageSummaryResponse> {
		return await this.llmUsageService.getSummary(query.days);
	}

	@Get('/calls')
	@GlobalScope('llmUsage:read')
	async getCalls(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query query: LlmUsageCallsQueryDto,
	): Promise<LlmUsageCallsResponse> {
		return await this.llmUsageService.getCalls(query);
	}
}
