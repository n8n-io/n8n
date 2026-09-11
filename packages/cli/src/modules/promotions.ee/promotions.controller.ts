import { PromoteSelectionRequestDto, type PromotePackageResultDto } from '@n8n/api-types';
import { LICENSE_FEATURES } from '@n8n/constants';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Licensed, Param, Post, ProjectScope, RestController } from '@n8n/decorators';
import { hasGlobalScope } from '@n8n/permissions';
import type { Response } from 'express';

import { PromotionsService } from './promotions.service';

@RestController('/promotions')
export class PromotionsController {
	constructor(private readonly promotionsService: PromotionsService) {}

	@Post('/:projectId/promote')
	@ProjectScope('project:export')
	@Licensed(LICENSE_FEATURES.GIT_CONNECTIONS)
	async promote(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId') projectId: string,
		@Body body: PromoteSelectionRequestDto,
	): Promise<PromotePackageResultDto> {
		return await this.promotionsService.promoteProjectSelection(projectId, req.user, {
			...body,
			// Variable values only travel when the user may list them.
			canExportVariableValues: hasGlobalScope(req.user, 'variable:list'),
		});
	}
}
