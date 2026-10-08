import { CreateSkillDto, ListSkillsQueryDto, UpdateAgentSkillDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Delete, Get, Param, Patch, Post, Query, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { SkillsApiService } from './skills/skills-api.service';

/**
 * Skills for the settings page. No route scope: the scope of each skill decides who may
 * see or change it, so `SkillsApiService` checks every row.
 */
@RestController('/skills')
export class SkillsController {
	constructor(private readonly skillsApi: SkillsApiService) {}

	@Get('/')
	async list(req: AuthenticatedRequest, _res: Response, @Query query: ListSkillsQueryDto) {
		return await this.skillsApi.list(req.user, query);
	}

	@Get('/:skillId')
	async get(req: AuthenticatedRequest, _res: Response, @Param('skillId') skillId: string) {
		return await this.skillsApi.get(req.user, skillId);
	}

	@Post('/')
	async create(req: AuthenticatedRequest, _res: Response, @Body payload: CreateSkillDto) {
		return await this.skillsApi.create(req.user, payload);
	}

	@Patch('/:skillId')
	async updateDraft(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('skillId') skillId: string,
		@Body payload: UpdateAgentSkillDto,
	) {
		return await this.skillsApi.updateDraft(req.user, skillId, payload);
	}

	@Post('/:skillId/save')
	async save(req: AuthenticatedRequest, _res: Response, @Param('skillId') skillId: string) {
		return await this.skillsApi.save(req.user, skillId);
	}

	@Delete('/:skillId')
	async delete(req: AuthenticatedRequest, _res: Response, @Param('skillId') skillId: string) {
		await this.skillsApi.delete(req.user, skillId);
		return { ok: true };
	}
}
