import {
	CreateExecutionQuotaDto,
	ListExecutionQuotaQueryDto,
	UpdateExecutionQuotaDto,
} from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import {
	Body,
	Delete,
	Get,
	GlobalScope,
	Param,
	Patch,
	Post,
	Query,
	RestController,
} from '@n8n/decorators';
import type { Response } from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { ExecutionQuotaConfigRepository } from './database/repositories/execution-quota-config.repository';
import { ExecutionQuotaCounterRepository } from './database/repositories/execution-quota-counter.repository';
import { ExecutionQuotaService } from './execution-quota.service';

@RestController('/execution-quotas')
export class ExecutionQuotaController {
	constructor(
		private readonly quotaService: ExecutionQuotaService,
		private readonly configRepository: ExecutionQuotaConfigRepository,
		private readonly counterRepository: ExecutionQuotaCounterRepository,
	) {}

	@Get('/')
	@GlobalScope('project:read')
	async listQuotas(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query payload: ListExecutionQuotaQueryDto,
	) {
		if (payload.projectId) {
			return await this.configRepository.find({
				where: { projectId: payload.projectId },
			});
		}
		return await this.configRepository.find();
	}

	@Get('/:id')
	@GlobalScope('project:read')
	async getQuota(_req: AuthenticatedRequest, _res: Response, @Param('id') id: string) {
		const quota = await this.configRepository.findOneBy({ id: parseInt(id, 10) });
		if (!quota) {
			throw new NotFoundError(`Quota with ID ${id} not found`);
		}
		return quota;
	}

	@Post('/')
	@GlobalScope('project:update')
	async createQuota(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body payload: CreateExecutionQuotaDto,
	) {
		if (payload.enforcementMode === 'workflow' && !payload.quotaWorkflowId) {
			throw new BadRequestError('quotaWorkflowId is required when enforcementMode is "workflow"');
		}

		if (!payload.projectId && !payload.workflowId) {
			throw new BadRequestError('Either projectId or workflowId must be provided');
		}

		const quota = this.configRepository.create(payload);
		const saved = await this.configRepository.save(quota);

		this.quotaService.refreshCache();

		return saved;
	}

	@Patch('/:id')
	@GlobalScope('project:update')
	async updateQuota(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('id') id: string,
		@Body payload: UpdateExecutionQuotaDto,
	) {
		const quota = await this.configRepository.findOneBy({ id: parseInt(id, 10) });
		if (!quota) {
			throw new NotFoundError(`Quota with ID ${id} not found`);
		}

		Object.assign(quota, payload);
		const updated = await this.configRepository.save(quota);

		this.quotaService.refreshCache();

		return updated;
	}

	@Delete('/:id')
	@GlobalScope('project:update')
	async deleteQuota(_req: AuthenticatedRequest, _res: Response, @Param('id') id: string) {
		const result = await this.configRepository.delete({ id: parseInt(id, 10) });
		if (!result.affected) {
			throw new NotFoundError(`Quota with ID ${id} not found`);
		}

		this.quotaService.refreshCache();

		return { success: true };
	}

	/** Dashboard endpoint: get usage data for all configured quotas */
	@Get('/usage/dashboard')
	@GlobalScope('project:read')
	async getDashboardUsage() {
		const configs = await this.configRepository.getAllEnabled();

		const usageData = await Promise.all(
			configs.map(async (config) => {
				const periodStart = this.quotaService.calculatePeriodStart(config.period);
				const isWorkflowLevel = config.workflowId !== null;
				const currentCount = await this.counterRepository.getCount(
					config.projectId!,
					isWorkflowLevel ? config.workflowId : null,
					periodStart,
				);

				return {
					id: config.id,
					projectId: config.projectId,
					workflowId: config.workflowId,
					period: config.period,
					limit: config.limit,
					currentCount,
					percentage: config.limit > 0 ? (currentCount / config.limit) * 100 : 0,
					enforcementMode: config.enforcementMode,
					enabled: config.enabled,
				};
			}),
		);

		return usageData.sort((a, b) => b.percentage - a.percentage);
	}
}
