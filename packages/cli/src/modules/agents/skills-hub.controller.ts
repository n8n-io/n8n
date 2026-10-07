import { CreateHubSkillDto, ListHubSkillsQueryDto, UpdateAgentSkillDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Delete, Get, Param, Patch, Post, Query, RestController } from '@n8n/decorators';
import { BadRequestError } from '@n8n/errors';
import type { Response } from 'express';

import { SkillsHubApiService } from './skills-hub/skills-hub-api.service';
import { CollaborationService } from '@/collaboration/collaboration.service';

/**
 * Settings > Context > Skills. No route scope: a skill's own scope decides who may
 * see or change it, so the service checks every row (see `SkillsHubApiService`).
 */
@RestController('/skills-hub')
export class SkillsHubController {
	constructor(
		private readonly skillsHubApi: SkillsHubApiService,
		private readonly collaborationService: CollaborationService,
	) {}

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
		await this.validateLock(req, skillId);
		return await this.skillsHubApi.updateDraft(req.user, skillId, payload);
	}

	@Post('/:skillId/save')
	async save(req: AuthenticatedRequest, _res: Response, @Param('skillId') skillId: string) {
		await this.validateLock(req, skillId);
		return await this.skillsHubApi.save(req.user, skillId);
	}

	@Delete('/:skillId')
	async delete(req: AuthenticatedRequest, _res: Response, @Param('skillId') skillId: string) {
		await this.validateLock(req, skillId);
		await this.skillsHubApi.delete(req.user, skillId);
		return { ok: true };
	}

	/** Takes or renews this tab's edit lock. The editor calls it on open and then on a timer. */
	@Post('/:skillId/edit-lock')
	async acquireEditLock(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('skillId') skillId: string,
	) {
		const clientId = req.headers?.['push-ref'];
		if (!clientId) throw new BadRequestError('Missing push-ref header');
		await this.skillsHubApi.assertCanEdit(req.user, skillId);
		return await this.collaborationService.acquireSkillWriteLock(req.user.id, clientId, skillId);
	}

	@Delete('/:skillId/edit-lock')
	async releaseEditLock(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('skillId') skillId: string,
	) {
		const clientId = req.headers?.['push-ref'];
		if (clientId) await this.collaborationService.releaseSkillWriteLock(clientId, skillId);
		return { ok: true };
	}

	private async validateLock(req: AuthenticatedRequest, skillId: string) {
		await this.collaborationService.validateSkillWriteLock(
			req.user.id,
			req.headers?.['push-ref'],
			skillId,
		);
	}
}
