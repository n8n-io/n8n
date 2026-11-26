import type { ProjectPromotionEnvironmentsResponse } from '@n8n/api-types';
import { LICENSE_FEATURES } from '@n8n/constants';
import { AuthenticatedRequest } from '@n8n/db';
import { Get, Licensed, Param, ProjectScope, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { ProjectPromotionEnvironmentsService } from './project-promotion-environments.service';

@RestController('/projects/:projectId/promotion-environments')
export class ProjectPromotionEnvironmentsController {
	constructor(private readonly service: ProjectPromotionEnvironmentsService) {}

	@Get('/')
	@Licensed(LICENSE_FEATURES.PROMOTIONS)
	@ProjectScope('project:read')
	async get(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId') projectId: string,
	): Promise<ProjectPromotionEnvironmentsResponse> {
		return await this.service.get(projectId);
	}
}
