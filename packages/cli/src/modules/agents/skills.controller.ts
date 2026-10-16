import {
	CreateSkillDto,
	ListSkillsQueryDto,
	SaveSkillDto,
	SkillNewNameQueryDto,
	UpdateSkillVersionDto,
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
import { BadRequestError } from '@n8n/errors';
import type { NextFunction, Request, Response } from 'express';

import { SkillsApiService } from './skills/skills-api.service';
import { SkillsHubRollout } from './skills/skills-hub-rollout';

/**
 * Skills for the settings page. No route scope: the scope of each skill decides who may
 * see or change it, so `SkillsApiService` checks every row.
 */
@RestController('/skills')
export class SkillsController {
	constructor(
		private readonly skillsApi: SkillsApiService,
		private readonly rollout: SkillsHubRollout,
	) {}

	/** Runs before the request is validated, so every request answers 404 while the flag is off. */
	@Middleware()
	requireSkillsHub(_req: Request, res: Response, next: NextFunction) {
		if (!this.rollout.isEnabled) {
			res.status(404).send('Not found');
			return;
		}
		next();
	}

	@Get('/')
	async list(req: AuthenticatedRequest, _res: Response, @Query query: ListSkillsQueryDto) {
		return await this.skillsApi.list(req.user, query);
	}

	/** Registered before `/:skillId`, which would take `new-name` as an id. */
	@Get('/new-name')
	async newName(req: AuthenticatedRequest, _res: Response, @Query query: SkillNewNameQueryDto) {
		return await this.skillsApi.newName(req.user, query);
	}

	@Get('/:skillId/versions')
	async listVersions(req: AuthenticatedRequest, _res: Response, @Param('skillId') skillId: string) {
		return await this.skillsApi.listVersions(req.user, skillId);
	}

	@Get('/:skillId/versions/:version')
	async getVersion(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('skillId') skillId: string,
		@Param('version') version: string,
	) {
		return await this.skillsApi.getVersion(req.user, skillId, parseVersionNumber(version));
	}

	/** Names or renames one saved version. Needs the same permission as Save. */
	@Patch('/:skillId/versions/:version')
	async updateVersion(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('skillId') skillId: string,
		@Param('version') version: string,
		@Body payload: UpdateSkillVersionDto,
	) {
		return await this.skillsApi.updateVersion(
			req.user,
			skillId,
			parseVersionNumber(version),
			payload,
		);
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

/** A version number from the URL: a positive integer, as `skill_version.version` is. */
function parseVersionNumber(raw: string): number {
	if (!/^[1-9]\d{0,8}$/.test(raw)) throw new BadRequestError('Version must be a positive integer.');
	return Number(raw);
}
