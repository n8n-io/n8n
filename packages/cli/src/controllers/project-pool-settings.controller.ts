import type { ProjectPoolSettingsResponse } from '@n8n/api-types';
import { UpdateProjectPoolSettingsDto } from '@n8n/api-types';
import { LICENSE_FEATURES } from '@n8n/constants';
import { Body, Get, Licensed, Param, Patch, ProjectScope, RestController } from '@n8n/decorators';
import type { Request, Response } from 'express';

import { PoolConfigService } from '@/scaling/pool-config.service';

@RestController('/projects/:projectId/pool-settings')
export class ProjectPoolSettingsController {
	constructor(private readonly poolConfigService: PoolConfigService) {}

	@Licensed(LICENSE_FEATURES.WORKER_VIEW)
	@ProjectScope('project:read')
	@Get('/')
	async getPoolSettings(
		_req: Request,
		_res: Response,
		@Param('projectId') projectId: string,
	): Promise<ProjectPoolSettingsResponse> {
		return await this.poolConfigService.getProjectPoolSettings(projectId);
	}

	@Licensed(LICENSE_FEATURES.WORKER_VIEW)
	@ProjectScope('project:update')
	@Patch('/')
	async updatePoolSettings(
		_req: Request,
		_res: Response,
		@Body dto: UpdateProjectPoolSettingsDto,
		@Param('projectId') projectId: string,
	): Promise<ProjectPoolSettingsResponse> {
		return await this.poolConfigService.setProjectPoolSettings(projectId, dto);
	}
}
