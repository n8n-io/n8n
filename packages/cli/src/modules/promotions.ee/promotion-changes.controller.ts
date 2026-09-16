import { PromotionChangesQueryDto, type PromotionChanges } from '@n8n/api-types';
import { LICENSE_FEATURES } from '@n8n/constants';
import { AuthenticatedRequest } from '@n8n/db';
import { Get, Licensed, Param, Query, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { PromotionChangeService } from './promotion-change.service';

@RestController('/promotions')
export class PromotionChangesController {
	constructor(private readonly changeService: PromotionChangeService) {}

	@Get('/:projectId/changes')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	async getChanges(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId') projectId: string,
		@Query query: PromotionChangesQueryDto,
	): Promise<PromotionChanges> {
		return await this.changeService.getChanges(req.user, projectId, query);
	}
}
