import {
	ApplyCheckQueryDto,
	PromotionChangesQueryDto,
	PromotionResourceDetailsRequestDto,
	promotionDirectionSchema,
	type ApplyCheckResult,
	type PromotionDirection,
	type PromotionPreview,
	type PromotionResourceDetails,
} from '@n8n/api-types';
import { LICENSE_FEATURES } from '@n8n/constants';
import { AuthenticatedRequest } from '@n8n/db';
import {
	Body,
	Get,
	GlobalScope,
	Licensed,
	Param,
	Post,
	Query,
	RestController,
} from '@n8n/decorators';
import type { Response } from 'express';

import { NotFoundError } from '@n8n/errors';

import { PromotionChangeService } from './promotion-change.service';
import { PromotionsService } from './promotions.service';

@RestController('/promotions')
export class PromotionChangesController {
	constructor(
		private readonly changeService: PromotionChangeService,
		private readonly promotionsService: PromotionsService,
	) {}

	@Get('/:projectId/changes/:direction')
	@GlobalScope('gitConnection:read')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	async getChanges(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId') projectId: string,
		@Param('direction') direction: string,
		@Query query: PromotionChangesQueryDto,
	): Promise<PromotionPreview> {
		return await this.changeService.getPreview(
			req.user,
			projectId,
			parseDirection(direction),
			query,
		);
	}

	// Apply needs the pull scope, so its check does too.
	@Get('/:projectId/changes/apply/blockers')
	@GlobalScope('gitConnection:pull')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	async getApplyBlockers(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId') projectId: string,
		@Query query: ApplyCheckQueryDto,
	): Promise<ApplyCheckResult> {
		return await this.promotionsService.checkApplyBlockers(projectId, query.commitSha);
	}

	@Post('/:projectId/changes/:direction/details')
	@GlobalScope('gitConnection:read')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	async getDetails(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId') projectId: string,
		@Param('direction') direction: string,
		@Body body: PromotionResourceDetailsRequestDto,
	): Promise<PromotionResourceDetails> {
		return await this.changeService.getDetails(
			req.user,
			projectId,
			parseDirection(direction),
			body,
		);
	}
}

function parseDirection(direction: string): PromotionDirection {
	const parsed = promotionDirectionSchema.safeParse(direction);
	// An unknown direction addresses nothing, so it is a 404 rather than a 400.
	if (!parsed.success) throw new NotFoundError(`Unknown promotion direction: ${direction}`);
	return parsed.data;
}
