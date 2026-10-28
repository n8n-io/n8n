import {
	CreateLlmBudgetPublicDto,
	ListLlmBudgetsQueryPublicDto,
	LlmBudgetListPublicDto,
	LlmBudgetPublicDto,
	LlmBudgetStatusPublicDto,
	llmBudgetIdParamSchema,
	UpdateLlmBudgetPublicDto,
} from '@n8n/api-types';
import { ModuleRegistry } from '@n8n/backend-common';
import {
	LlmBudgetService,
	type LlmBudget,
	type LlmBudgetFields,
} from '@n8n/backend-module-llm-usage';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { AuthenticatedRequest } from '@n8n/db';
import {
	ApiDescription,
	ApiErrorResponse,
	ApiKeyScope,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Body,
	Delete,
	Get,
	GlobalScope,
	Licensed,
	Param,
	Post,
	PublicApiController,
	Put,
	Query,
} from '@n8n/decorators';
import type { Response } from 'express';

import { BadRequestError, ServiceUnavailableError } from '@n8n/errors';
import {
	encodeNextCursor,
	resolveOffsetPagination,
} from '@/public-api/v1/shared/services/pagination.service';

const tags = ['LLM budgets'];

/** Agents own the budgets that their config defines (spec Part C). */
const AGENT_OWNER = 'agent';

const toFields = (dto: CreateLlmBudgetPublicDto): LlmBudgetFields => ({
	name: dto.name,
	enabled: dto.enabled,
	target: dto.target,
	timeWindow: dto.window,
	metric: dto.metric,
	limitAmount: dto.limit,
	action: dto.action,
	warnAtPercent: dto.warnAtPercent,
	managedBy: dto.managedBy,
	externalId: dto.externalId,
});

const toPublicDto = (budget: LlmBudget): LlmBudgetPublicDto => ({
	id: budget.id,
	name: budget.name,
	enabled: budget.enabled,
	target: budget.target,
	window: budget.timeWindow,
	metric: budget.metric,
	limit: budget.limitAmount,
	action: budget.action,
	warnAtPercent: budget.warnAtPercent,
	managedBy: budget.managedBy,
	externalId: budget.externalId,
	version: budget.version,
	createdAt: budget.createdAt.toISOString(),
	updatedAt: budget.updatedAt.toISOString(),
});

const refuseAgentOwned = (managedBy: string | null) => {
	if (managedBy === AGENT_OWNER) {
		throw new BadRequestError('This budget belongs to an agent. Edit the budget in the agent.');
	}
};

@PublicApiController('/llm-budgets')
export class LlmBudgetsPublicController {
	constructor(
		private readonly moduleRegistry: ModuleRegistry,
		private readonly llmBudgetService: LlmBudgetService,
	) {}

	@Get('/')
	@Licensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)
	@ApiKeyScope('llmBudget:read')
	@GlobalScope('llmBudget:read')
	@ApiSummary('Retrieve LLM budgets')
	@ApiDescription('Retrieve the LLM spending budgets of your instance, oldest first.')
	@ApiTags(tags)
	@ApiResponse(200, LlmBudgetListPublicDto)
	@ApiErrorResponse(503)
	async listLlmBudgets(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query query: ListLlmBudgetsQueryPublicDto,
	): Promise<LlmBudgetListPublicDto> {
		const { offset, limit } = resolveOffsetPagination(query);
		const { rows, count } = await this.service().list(offset, limit);
		return {
			data: rows.map(toPublicDto),
			nextCursor: encodeNextCursor({ offset, limit, numberOfTotalRecords: count }),
		};
	}

	@Post('/')
	@Licensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)
	@ApiKeyScope('llmBudget:manage')
	@GlobalScope('llmBudget:manage')
	@ApiSummary('Create an LLM budget')
	@ApiDescription(
		'Create a spending budget for LLM calls of workflows and agents. A `block` budget stops the calls of a target that reached its limit. The spend is an estimate from public list prices.',
	)
	@ApiTags(tags)
	@ApiResponse(201, LlmBudgetPublicDto)
	@ApiErrorResponse(503)
	async createLlmBudget(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body dto: CreateLlmBudgetPublicDto,
	): Promise<LlmBudgetPublicDto> {
		refuseAgentOwned(dto.managedBy);
		return toPublicDto(await this.service().create(toFields(dto)));
	}

	@Get('/:llmBudgetId')
	@Licensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)
	@ApiKeyScope('llmBudget:read')
	@GlobalScope('llmBudget:read')
	@ApiSummary('Retrieve an LLM budget')
	@ApiTags(tags)
	@ApiResponse(200, LlmBudgetPublicDto)
	@ApiErrorResponse(404)
	@ApiErrorResponse(503)
	async getLlmBudget(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('llmBudgetId', llmBudgetIdParamSchema) llmBudgetId: string,
	): Promise<LlmBudgetPublicDto> {
		return toPublicDto(await this.service().get(llmBudgetId));
	}

	@Put('/:llmBudgetId')
	@Licensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)
	@ApiKeyScope('llmBudget:manage')
	@GlobalScope('llmBudget:manage')
	@ApiSummary('Update an LLM budget')
	@ApiDescription(
		'Replace an LLM budget. Send the `version` you read: a newer stored version gives 409.',
	)
	@ApiTags(tags)
	@ApiResponse(200, LlmBudgetPublicDto)
	@ApiErrorResponse(404)
	@ApiErrorResponse(409)
	@ApiErrorResponse(503)
	async updateLlmBudget(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('llmBudgetId', llmBudgetIdParamSchema) llmBudgetId: string,
		@Body dto: UpdateLlmBudgetPublicDto,
	): Promise<LlmBudgetPublicDto> {
		const service = this.service();
		refuseAgentOwned((await service.get(llmBudgetId)).managedBy);
		refuseAgentOwned(dto.managedBy);
		return toPublicDto(await service.update(llmBudgetId, dto.version, toFields(dto)));
	}

	@Delete('/:llmBudgetId')
	@Licensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)
	@ApiKeyScope('llmBudget:manage')
	@GlobalScope('llmBudget:manage')
	@ApiSummary('Delete an LLM budget')
	@ApiTags(tags)
	@ApiResponse(204)
	@ApiErrorResponse(404)
	@ApiErrorResponse(503)
	async deleteLlmBudget(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('llmBudgetId', llmBudgetIdParamSchema) llmBudgetId: string,
	): Promise<void> {
		const service = this.service();
		refuseAgentOwned((await service.get(llmBudgetId)).managedBy);
		await service.delete(llmBudgetId);
	}

	@Get('/:llmBudgetId/status')
	@Licensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)
	@ApiKeyScope('llmBudget:read')
	@GlobalScope('llmBudget:read')
	@ApiSummary('Retrieve the spend of an LLM budget')
	@ApiDescription(
		'Retrieve the counters of an enabled budget in its current window, highest spend first. A budget on all users has one counter for each user.',
	)
	@ApiTags(tags)
	@ApiResponse(200, LlmBudgetStatusPublicDto)
	@ApiErrorResponse(404)
	@ApiErrorResponse(503)
	async getLlmBudgetStatus(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('llmBudgetId', llmBudgetIdParamSchema) llmBudgetId: string,
		@Query query: ListLlmBudgetsQueryPublicDto,
	): Promise<LlmBudgetStatusPublicDto> {
		const { offset, limit } = resolveOffsetPagination(query);
		const { counters, count } = await this.service().status(llmBudgetId, offset, limit);
		return {
			data: counters.map(({ key, costUsd, percent, unpriced }) => ({
				key,
				spent: costUsd,
				percent,
				unpricedCalls: unpriced,
			})),
			nextCursor: encodeNextCursor({ offset, limit, numberOfTotalRecords: count }),
		};
	}

	/** Budgets read the costs of the llm-usage module, so they work only while it runs. */
	private service() {
		if (!this.moduleRegistry.isActive('llm-usage')) {
			throw new ServiceUnavailableError('LLM usage module is not enabled');
		}
		return this.llmBudgetService;
	}
}
