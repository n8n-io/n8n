import {
	ListLlmUsageCallsQueryPublicDto,
	LlmUsageCallListPublicDto,
	type LlmUsageCallPublicDto,
} from '@n8n/api-types';
import { ModuleRegistry } from '@n8n/backend-common';
import { LlmUsageService, type LlmUsageCall } from '@n8n/backend-module-llm-usage';
import { Time } from '@n8n/constants';
import type { AuthenticatedRequest } from '@n8n/db';
import {
	ApiDescription,
	ApiErrorResponse,
	ApiKeyScope,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Get,
	GlobalScope,
	PublicApiController,
	Query,
} from '@n8n/decorators';
import type { Response } from 'express';

import { BadRequestError, ServiceUnavailableError } from '@n8n/errors';
import {
	encodeNextCursor,
	resolveOffsetPagination,
} from '@/public-api/v1/shared/services/pagination.service';

const DEFAULT_RANGE_DAYS = 30;
/** The longest range that the module keeps prices current for. */
const MAX_RANGE_DAYS = 90;

const toCallPublicDto = (call: LlmUsageCall): LlmUsageCallPublicDto => ({
	callId: call.callId,
	startedAt: call.startedAt?.toISOString() ?? null,
	finishedAt: call.finishedAt.toISOString(),
	durationMs: call.durationMs,
	callerType: call.callerType,
	workflowId: call.workflowId,
	executionId: call.executionId,
	executionMode: call.executionMode,
	nodeName: call.nodeName,
	nodeType: call.nodeType,
	agentId: call.agentId,
	threadId: call.threadId,
	projectId: call.projectId,
	userId: call.userId,
	credentialId: call.credentialId,
	managedBy: call.managedBy,
	provider: call.provider,
	model: call.model,
	inputTokens: call.inputTokens,
	outputTokens: call.outputTokens,
	cacheReadTokens: call.cacheReadTokens,
	cacheWriteTokens: call.cacheWriteTokens,
	estimatedCostUsd: call.estimatedCostUsd,
});

@PublicApiController('/llm-usage')
export class LlmUsagePublicController {
	constructor(
		private readonly moduleRegistry: ModuleRegistry,
		private readonly llmUsageService: LlmUsageService,
	) {}

	@Get('/calls')
	@ApiKeyScope('llmUsage:read')
	@GlobalScope('llmUsage:read')
	@ApiSummary('Retrieve LLM calls')
	@ApiDescription(
		'Retrieve the LLM calls of your instance in a date range, oldest first, with their token counts, estimated cost and the credential that paid for them.',
	)
	@ApiTags(['LLM usage'])
	@ApiResponse(200, LlmUsageCallListPublicDto)
	@ApiErrorResponse(503)
	async getCalls(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query query: ListLlmUsageCallsQueryPublicDto,
	): Promise<LlmUsageCallListPublicDto> {
		if (!this.moduleRegistry.isActive('llm-usage')) {
			throw new ServiceUnavailableError('LLM usage module is not enabled');
		}

		const to = query.endDate ? new Date(query.endDate) : new Date();
		const from = query.startDate
			? new Date(query.startDate)
			: new Date(to.getTime() - DEFAULT_RANGE_DAYS * Time.days.toMilliseconds);
		if (from >= to) throw new BadRequestError('endDate must be after startDate');
		if (to.getTime() - from.getTime() > MAX_RANGE_DAYS * Time.days.toMilliseconds) {
			throw new BadRequestError(`The date range can be at most ${MAX_RANGE_DAYS} days`);
		}

		const { offset, limit } = resolveOffsetPagination(query);
		const { count, items } = await this.llmUsageService.listCallsInRange({
			from,
			to,
			offset,
			limit,
		});

		return {
			data: items.map(toCallPublicDto),
			nextCursor: encodeNextCursor({ offset, limit, numberOfTotalRecords: count }),
		};
	}
}
