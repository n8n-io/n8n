import { PromotionChangesQueryDto, type PromotableResource } from '@n8n/api-types';
import { LICENSE_FEATURES } from '@n8n/constants';
import { AuthenticatedRequest } from '@n8n/db';
import { Get, Licensed, Param, ProjectScope, Query, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { PromotionChangeService } from './promotion-change.service';

@RestController('/promotions')
export class PromotionChangesController {
	constructor(private readonly changeService: PromotionChangeService) {}

	@Get('/:projectId/changes')
	@ProjectScope('project:export')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	async getChanges(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId') projectId: string,
		@Query query: PromotionChangesQueryDto,
	): Promise<PromotableResource[]> {
		const changes = await this.changeService.getChanges(req.user, projectId);
		const search = query.search?.toLocaleLowerCase();
		return changes
			.filter(({ name }) => !search || name.toLocaleLowerCase().includes(search))
			.sort((a, b) => {
				const comparison = (a[query.sort] ?? '').localeCompare(b[query.sort] ?? '');
				return (query.order === 'desc' ? -comparison : comparison) || a.id.localeCompare(b.id);
			});
	}
}
