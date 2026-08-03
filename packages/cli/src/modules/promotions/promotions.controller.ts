import type {
	PromotionModelDescription,
	PromotionsConfigView,
	PromotionSummary,
} from '@n8n/api-types';
import { CreatePromotionRequestDto, PromotionActionRequestDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, GlobalScope, Param, Post, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { toPromotionSummary } from './promotion.mapper';
import { PromotionModelRegistry } from './promotion-model-registry';
import { PromotionsConfig } from './promotions.config';
import { PromotionsService } from './promotions.service';

/**
 * Session-authenticated surface for the editor UI, mirroring the public-API
 * controller. POC shortcut shared with it: no dedicated promotions scopes yet,
 * so everything borrows `sourceControl:manage` (owner/admin) — promotions move
 * content between environments much like source control does.
 */
@RestController('/promotions')
export class PromotionsController {
	constructor(
		private readonly promotionsService: PromotionsService,
		private readonly registry: PromotionModelRegistry,
		private readonly config: PromotionsConfig,
	) {}

	@Get('/')
	@GlobalScope('sourceControl:manage')
	async list(): Promise<PromotionSummary[]> {
		return (await this.promotionsService.list()).map(toPromotionSummary);
	}

	@Get('/models')
	@GlobalScope('sourceControl:manage')
	async models(): Promise<PromotionModelDescription[]> {
		return this.registry.list().map((model) => ({ name: model.name }));
	}

	@Get('/config')
	@GlobalScope('sourceControl:manage')
	async getConfig(): Promise<PromotionsConfigView> {
		const { githubToken, githubRepo, githubBranch, githubPollInterval } = this.config;
		return {
			githubRepo,
			githubBranch,
			trackerEnabled:
				githubToken !== '' && githubRepo !== '' && githubBranch !== '' && githubPollInterval > 0,
		};
	}

	@Post('/')
	@GlobalScope('sourceControl:manage')
	async create(
		req: AuthenticatedRequest,
		res: Response,
		@Body dto: CreatePromotionRequestDto,
	): Promise<PromotionSummary> {
		const promotion = await this.promotionsService.submit(
			{ model: dto.model, unitOfWork: dto.unitOfWork, options: dto.options },
			req.user,
		);
		res.status(201);
		return toPromotionSummary(promotion);
	}

	@Post('/:promotionId/actions/:action')
	@GlobalScope('sourceControl:manage')
	async executeAction(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('promotionId') promotionId: string,
		@Param('action') action: string,
		@Body dto: PromotionActionRequestDto,
	): Promise<PromotionSummary> {
		return toPromotionSummary(
			await this.promotionsService.executeAction(promotionId, action, dto.payload, req.user),
		);
	}

	@Post('/:promotionId/sync')
	@GlobalScope('sourceControl:manage')
	async sync(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('promotionId') promotionId: string,
	): Promise<PromotionSummary> {
		return toPromotionSummary(await this.promotionsService.sync(promotionId, req.user));
	}

	// Keep this last: routes register in declaration order, so `/:promotionId`
	// declared earlier would swallow the literal paths above.
	@Get('/:promotionId')
	@GlobalScope('sourceControl:manage')
	async get(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('promotionId') promotionId: string,
	): Promise<PromotionSummary> {
		return toPromotionSummary(await this.promotionsService.get(promotionId));
	}
}
