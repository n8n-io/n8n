import {
	PromotionChangesQueryDto,
	promotionDirectionSchema,
	type PromotionChanges,
} from '@n8n/api-types';
import { LICENSE_FEATURES } from '@n8n/constants';
import { AuthenticatedRequest } from '@n8n/db';
import { Get, GlobalScope, Licensed, Param, Query, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { PromotionChangeService } from './promotion-change.service';

@RestController('/promotions')
export class PromotionChangesController {
	constructor(private readonly changeService: PromotionChangeService) {}

	@Get('/:projectId/changes/:direction')
	@GlobalScope('gitConnection:read')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	async getChanges(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId') projectId: string,
		@Param('direction') direction: string,
		@Query query: PromotionChangesQueryDto,
	): Promise<PromotionChanges> {
		const parsed = promotionDirectionSchema.safeParse(direction);
		// An unknown direction addresses nothing, so it is a 404 rather than a 400.
		if (!parsed.success) throw new NotFoundError(`Unknown promotion direction: ${direction}`);
		return await this.changeService.getChanges(req.user, projectId, parsed.data, query);
	}
}
