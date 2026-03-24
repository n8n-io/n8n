import type {
	AiGatewayModelCategoryResponse,
	AiGatewayPrototypeRecordResponse,
	AiGatewaySettingsResponse,
	AiGatewayUsageResponse,
} from '@n8n/api-types';
import { AiGatewayPrototypeRecordDto, AiGatewaySettingsUpdateDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, Post, Put, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

import { AiGatewayConfig } from './ai-gateway.config';
import { AiGatewayModelService } from './ai-gateway-model.service';
import { AiGatewayUsageService } from './ai-gateway-usage.service';
import { AiGatewayService } from './ai-gateway.service';
import { MODEL_CATEGORIES, MODEL_CATEGORY_MAP, type ModelCategory } from './ai-gateway.constants';

const PROTOTYPE_CREDIT_COST_PER_CALL = 0.01;
const PROTOTYPE_DEFAULT_INPUT_TOKENS = 100;
const PROTOTYPE_DEFAULT_OUTPUT_TOKENS = 50;

@RestController('/ai-gateway')
export class AiGatewayController {
	constructor(
		private readonly config: AiGatewayConfig,
		private readonly gatewayService: AiGatewayService,
		private readonly modelService: AiGatewayModelService,
		private readonly usageService: AiGatewayUsageService,
	) {}

	@Get('/settings')
	async getSettings(
		_req: AuthenticatedRequest,
		_res: Response,
	): Promise<AiGatewaySettingsResponse> {
		const defaultCategory = MODEL_CATEGORIES.includes(this.config.defaultCategory as ModelCategory)
			? (this.config.defaultCategory as ModelCategory)
			: 'balanced';
		return {
			enabled: this.config.enabled,
			defaultCategory,
			defaultModel: MODEL_CATEGORY_MAP[defaultCategory],
			defaultChatModel: this.config.defaultChatModel,
			defaultTextModel: this.config.defaultTextModel,
			defaultImageModel: this.config.defaultImageModel,
			defaultFileModel: this.config.defaultFileModel,
			defaultAudioModel: this.config.defaultAudioModel,
			creditsRemaining: this.config.creditsRemaining,
		};
	}

	@Put('/settings')
	async updateSettings(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body payload: AiGatewaySettingsUpdateDto,
	): Promise<AiGatewaySettingsResponse> {
		if (payload.defaultCategory !== undefined) {
			this.config.defaultCategory = payload.defaultCategory;
		}
		if (payload.defaultChatModel !== undefined) {
			this.config.defaultChatModel = payload.defaultChatModel;
		}
		if (payload.defaultTextModel !== undefined) {
			this.config.defaultTextModel = payload.defaultTextModel;
		}
		if (payload.defaultImageModel !== undefined) {
			this.config.defaultImageModel = payload.defaultImageModel;
		}
		if (payload.defaultFileModel !== undefined) {
			this.config.defaultFileModel = payload.defaultFileModel;
		}
		if (payload.defaultAudioModel !== undefined) {
			this.config.defaultAudioModel = payload.defaultAudioModel;
		}

		if (
			payload.defaultCategory !== undefined ||
			payload.defaultChatModel !== undefined ||
			payload.defaultTextModel !== undefined ||
			payload.defaultImageModel !== undefined ||
			payload.defaultFileModel !== undefined ||
			payload.defaultAudioModel !== undefined
		) {
			await this.gatewayService.provisionCredential();
			this.gatewayService.invalidateModelCache();
		}

		const defaultCategory = MODEL_CATEGORIES.includes(this.config.defaultCategory as ModelCategory)
			? (this.config.defaultCategory as ModelCategory)
			: 'balanced';
		return {
			enabled: this.config.enabled,
			defaultCategory,
			defaultModel: MODEL_CATEGORY_MAP[defaultCategory],
			defaultChatModel: this.config.defaultChatModel,
			defaultTextModel: this.config.defaultTextModel,
			defaultImageModel: this.config.defaultImageModel,
			defaultFileModel: this.config.defaultFileModel,
			defaultAudioModel: this.config.defaultAudioModel,
			creditsRemaining: this.config.creditsRemaining,
		};
	}

	@Get('/model-categories')
	async getModelCategories(
		_req: AuthenticatedRequest,
		_res: Response,
	): Promise<AiGatewayModelCategoryResponse[]> {
		return this.modelService.getCategories();
	}

	@Get('/models')
	async getModels(_req: AuthenticatedRequest, _res: Response): Promise<unknown> {
		return await this.gatewayService.listModels();
	}

	@Get('/usage')
	async getUsage(_req: AuthenticatedRequest, _res: Response): Promise<AiGatewayUsageResponse> {
		return this.usageService.getUsage();
	}

	/**
	 * Prototype-only: record a model call for in-memory usage stats and decrement
	 * credits in-memory. Enabled by default; set N8N_AI_GATEWAY_PROTOTYPE_USAGE=false to disable.
	 */
	@Post('/prototype/record-call')
	async recordPrototypeCall(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body payload: AiGatewayPrototypeRecordDto,
	): Promise<AiGatewayPrototypeRecordResponse> {
		if (!this.config.prototypeUsageEnabled) {
			throw new ForbiddenError(
				'AI Gateway prototype usage recording is disabled. Set N8N_AI_GATEWAY_PROTOTYPE_USAGE=true to re-enable.',
			);
		}

		const calls = payload.calls ?? 1;
		const inputTokens = payload.inputTokens ?? PROTOTYPE_DEFAULT_INPUT_TOKENS;
		const outputTokens = payload.outputTokens ?? PROTOTYPE_DEFAULT_OUTPUT_TOKENS;
		const category = payload.category ?? 'prototype';
		const resolvedModel = payload.resolvedModel ?? 'openai/gpt-4.1-nano';

		for (let i = 0; i < calls; i++) {
			this.usageService.track({
				timestamp: new Date(),
				category,
				resolvedModel,
				inputTokens,
				outputTokens,
				workflowId: payload.workflowId,
				executionId: payload.executionId,
			});
		}

		this.config.creditsRemaining = Math.max(
			0,
			this.config.creditsRemaining - PROTOTYPE_CREDIT_COST_PER_CALL * calls,
		);

		return {
			creditsRemaining: this.config.creditsRemaining,
			usage: this.usageService.getUsage(),
		};
	}
}
