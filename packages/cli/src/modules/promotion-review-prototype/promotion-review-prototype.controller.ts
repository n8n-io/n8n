import { PromotionReviewCredentialsQueryDto, PromotionReviewPlanRequestDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, Param, Post, Query, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { PromotionReviewPrototypeService } from './promotion-review-prototype.service';

@RestController('/promotion-review-prototype')
export class PromotionReviewPrototypeController {
	constructor(private readonly promotionService: PromotionReviewPrototypeService) {}

	@Get('/pending')
	async listPending(req: AuthenticatedRequest, _res: Response) {
		return await this.promotionService.listPending(req.user);
	}

	@Get('/credentials')
	async listCredentials(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: PromotionReviewCredentialsQueryDto,
	) {
		const projectId = query?.projectId;
		if (!projectId) {
			return [];
		}
		return await this.promotionService.listUsableCredentials(
			req.user,
			projectId,
			query.type,
		);
	}

	@Get('/:promotionId')
	getPromotion(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('promotionId') promotionId: string,
	) {
		const promotion = this.promotionService.getPromotion(promotionId);
		return {
			id: promotion.id,
			title: promotion.title,
			sourceInstanceName: promotion.sourceInstanceName,
			sourceBranch: promotion.sourceBranch,
			submittedAt: promotion.submittedAt,
			submittedBy: promotion.submittedBy,
			status: promotion.status,
		};
	}

	@Post('/:promotionId/plan')
	async plan(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('promotionId') promotionId: string,
		@Body body: PromotionReviewPlanRequestDto,
	) {
		const request = this.parsePlanRequest(body);
		return await this.promotionService.plan(
			req.user,
			promotionId,
			request.projectId,
			request.credentialBindings ?? {},
		);
	}

	@Post('/:promotionId/approve')
	async approve(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('promotionId') promotionId: string,
		@Body body: PromotionReviewPlanRequestDto,
	) {
		const request = this.parsePlanRequest(body);
		return await this.promotionService.approve(
			req.user,
			promotionId,
			request.projectId,
			request.credentialBindings ?? {},
		);
	}

	@Post('/:promotionId/reject')
	reject(_req: AuthenticatedRequest, _res: Response, @Param('promotionId') promotionId: string) {
		this.promotionService.reject(promotionId);
		return { success: true };
	}

	private parsePlanRequest(body: unknown) {
		const result = PromotionReviewPlanRequestDto.safeParse(body ?? {});
		return result.success ? result.data : {};
	}
}
