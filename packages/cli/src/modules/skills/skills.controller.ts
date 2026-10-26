import {
	CreateSkillDto,
	ListSkillAgentsQueryDto,
	ListSkillsQueryDto,
	SaveSkillDto,
	SkillNewNameQueryDto,
} from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import {
	Body,
	Delete,
	Get,
	Middleware,
	Param,
	Patch,
	Post,
	Query,
	RestController,
} from '@n8n/decorators';
import type { NextFunction, Request, Response } from 'express';

import { SkillsApiService } from './skills-api.service';
import { SkillAgentsProxy } from './skill-agents-proxy.service';

/**
 * Skills for the settings page. No route scope: the scope of each skill decides who may
 * see or change it, so `SkillsApiService` checks every row.
 */
@RestController('/skills')
export class SkillsController {
	constructor(
		private readonly skillsApi: SkillsApiService,
		private readonly skillAgents: SkillAgentsProxy,
	) {}

	/** Runs before the request is validated, so every request answers 404 while the agents module is off. */
	@Middleware()
	requireSkillProvider(_req: Request, res: Response, next: NextFunction) {
		if (!this.skillAgents.hasProvider) {
			res.status(404).send('Not found');
			return;
		}
		next();
	}

	@Get('/')
	async list(req: AuthenticatedRequest, _res: Response, @Query query: ListSkillsQueryDto) {
		return await this.skillsApi.list(req.user, query);
	}

	/** The creators of the skills the user may see. Registered before `/:skillId`. */
	@Get('/creators')
	async creators(req: AuthenticatedRequest) {
		return await this.skillsApi.listCreators(req.user);
	}

	/** The agents the user may read, for the agent filter. Registered before `/:skillId`. */
	@Get('/agents')
	async agents(req: AuthenticatedRequest, _res: Response, @Query query: ListSkillAgentsQueryDto) {
		return await this.skillsApi.listAgents(req.user, query);
	}

	/** Registered before `/:skillId`, which would take `new-name` as an id. */
	@Get('/new-name')
	async newName(req: AuthenticatedRequest, _res: Response, @Query query: SkillNewNameQueryDto) {
		return await this.skillsApi.newName(req.user, query);
	}

	@Get('/:skillId')
	async get(req: AuthenticatedRequest, _res: Response, @Param('skillId') skillId: string) {
		return await this.skillsApi.get(req.user, skillId);
	}

	@Post('/')
	async create(req: AuthenticatedRequest, _res: Response, @Body payload: CreateSkillDto) {
		return await this.skillsApi.create(req.user, payload);
	}

	/** Saves the changes as the next version. There is no draft: the editor keeps them until here. */
	@Patch('/:skillId')
	async update(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('skillId') skillId: string,
		@Body payload: SaveSkillDto,
	) {
		return await this.skillsApi.update(req.user, skillId, payload);
	}

	@Delete('/:skillId')
	async delete(req: AuthenticatedRequest, _res: Response, @Param('skillId') skillId: string) {
		await this.skillsApi.delete(req.user, skillId);
		return { ok: true };
	}
}
