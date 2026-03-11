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
		return {
			enabled: this.config.enabled,
			defaultCategory: this.config.defaultCategory,
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

		return {
			enabled: this.config.enabled,
			defaultCategory: this.config.defaultCategory,
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
