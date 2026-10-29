import {
	PromotionChangesQueryDto,
	PromotionResourceDetailsRequestDto,
	promotionDirectionSchema,
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

@RestController('/promotions')
export class PromotionChangesController {
	constructor(private readonly changeService: PromotionChangeService) {}

	@Get('/:projectId/changes/:direction')
	@GlobalScope('promotions:read')
	@Licensed(LICENSE_FEATURES.PROMOTIONS)
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

	@Post('/:projectId/changes/:direction/details')
	@GlobalScope('promotions:read')
	@Licensed(LICENSE_FEATURES.PROMOTIONS)
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
