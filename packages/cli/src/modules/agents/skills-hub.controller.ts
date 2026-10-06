import { CreateHubSkillDto, ListHubSkillsQueryDto, UpdateAgentSkillDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Delete, Get, Param, Patch, Post, Query, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { SkillsHubApiService } from './skills-hub/skills-hub-api.service';

/**
 * Settings > Context > Skills. No route scope: a skill's own scope decides who may
 * see or change it, so the service checks every row (see `SkillsHubApiService`).
 */
@RestController('/skills-hub')
export class SkillsHubController {
	constructor(private readonly skillsHubApi: SkillsHubApiService) {}

	@Get('/')
	async list(req: AuthenticatedRequest, _res: Response, @Query query: ListHubSkillsQueryDto) {
		return await this.skillsHubApi.list(req.user, query);
	}

	@Get('/:skillId')
	async get(req: AuthenticatedRequest, _res: Response, @Param('skillId') skillId: string) {
		return await this.skillsHubApi.get(req.user, skillId);
	}

	@Post('/')
	async create(req: AuthenticatedRequest, _res: Response, @Body payload: CreateHubSkillDto) {
		return await this.skillsHubApi.create(req.user, payload);
	}

	@Patch('/:skillId')
	async updateDraft(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('skillId') skillId: string,
		@Body payload: UpdateAgentSkillDto,
	) {
		return await this.skillsHubApi.updateDraft(req.user, skillId, payload);
	}

	@Post('/:skillId/save')
	async save(req: AuthenticatedRequest, _res: Response, @Param('skillId') skillId: string) {
		return await this.skillsHubApi.save(req.user, skillId);
	}

	@Delete('/:skillId')
	async delete(req: AuthenticatedRequest, _res: Response, @Param('skillId') skillId: string) {
		await this.skillsHubApi.delete(req.user, skillId);
		return { ok: true };
	}
}
