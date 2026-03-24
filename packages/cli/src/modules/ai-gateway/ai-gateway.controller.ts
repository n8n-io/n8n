import type {
	AiGatewayModelCategoryResponse,
	AiGatewaySettingsResponse,
	AiGatewayUsageResponse,
} from '@n8n/api-types';
import { AiGatewaySettingsUpdateDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, Put, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { AiGatewayConfig } from './ai-gateway.config';
import { AiGatewayModelService } from './ai-gateway-model.service';
import { AiGatewayUsageService } from './ai-gateway-usage.service';
import { AiGatewayService } from './ai-gateway.service';
import { MODEL_CATEGORIES, MODEL_CATEGORY_MAP, type ModelCategory } from './ai-gateway.constants';

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
}
