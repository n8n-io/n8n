import { CreatePromotionRequestDto, PromotionActionRequestDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { AuthenticatedRequest } from '@n8n/db';
import { ApiKeyScope, Body, Get, Param, Post, PublicApiController } from '@n8n/decorators';
import type { Response } from 'express';
import { UserError } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { PromotionsService } from '@/modules/promotions/promotions.service';

/**
 * POC promotion endpoints (see packages/cli/src/modules/promotions). Requires
 * the `promotions` module (N8N_ENABLED_MODULES=promotions) — with it disabled,
 * no models are registered and every call fails with "unknown model".
 *
 * POC: routes reuse the workflow:export API key scope instead of extending
 * the scopes catalog.
 */
@PublicApiController('/promotions')
export class PromotionsPublicController {
	constructor(
		private readonly promotionsService: PromotionsService,
		private readonly logger: Logger,
	) {}

	@Post('/')
	@ApiKeyScope('workflow:export')
	async createPromotion(
		req: AuthenticatedRequest,
		_res: Response,
		@Body body: CreatePromotionRequestDto,
	) {
		return await this.asBadRequest(async () => await this.promotionsService.submit(body, req.user));
	}

	@Get('/')
	@ApiKeyScope('workflow:export')
	async getPromotions(_req: AuthenticatedRequest, _res: Response) {
		return await this.promotionsService.list();
	}

	@Get('/:id')
	@ApiKeyScope('workflow:export')
	async getPromotion(_req: AuthenticatedRequest, _res: Response, @Param('id') id: string) {
		return await this.asBadRequest(async () => await this.promotionsService.get(id));
	}

	@Post('/:id/actions/:action')
	@ApiKeyScope('workflow:export')
	async runPromotionAction(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('id') id: string,
		@Param('action') action: string,
		@Body body: PromotionActionRequestDto,
	) {
		return await this.asBadRequest(
			async () => await this.promotionsService.executeAction(id, action, body.payload, req.user),
		);
	}

	@Post('/:id/sync')
	@ApiKeyScope('workflow:export')
	async syncPromotion(req: AuthenticatedRequest, _res: Response, @Param('id') id: string) {
		return await this.asBadRequest(async () => await this.promotionsService.sync(id, req.user));
	}

	/** Service-level UserErrors (unknown model, bad transition, not found) become 400s. */
	private async asBadRequest<T>(operation: () => Promise<T>): Promise<T> {
		try {
			return await operation();
		} catch (error) {
			if (error instanceof UserError) throw new BadRequestError(error.message);
			// The generic 500 response hides the cause; keep it findable for the POC
			this.logger.error(`Promotion operation failed: ${(error as Error).stack ?? String(error)}`);
			throw error;
		}
	}
}
