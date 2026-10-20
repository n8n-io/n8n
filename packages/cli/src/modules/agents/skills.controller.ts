import {
	AcceptSkillGitUpdateDto,
	CheckSkillContentDto,
	CreateSkillDto,
	DiscoverGitHubSkillsDto,
	ImportGitHubSkillsDto,
	ImportSharedSkillDto,
	SkipSkillGitUpdateDto,
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

import { SkillsGitHubApiService } from './skills/github/skills-github-api.service';
import { SkillShareApiService } from './skills/skill-share-api.service';
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
		private readonly gitHubApi: SkillsGitHubApiService,
		private readonly shareApi: SkillShareApiService,
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

	/** Runs the security check on skill content, before a share or an import. Stores nothing. */
	@Post('/check')
	check(_req: AuthenticatedRequest, _res: Response, @Body payload: CheckSkillContentDto) {
		return this.shareApi.check(payload);
	}

	/** Adds a skill from a share link. The browser decrypted it; the server checks it again. */
	@Post('/import-shared')
	async importShared(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: ImportSharedSkillDto,
	) {
		return await this.shareApi.importShared(req.user, payload);
	}

	/** Reads a public GitHub link and lists the skills in it, with their check results. */
	@Post('/github/discover')
	async discoverGitHub(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: DiscoverGitHubSkillsDto,
	) {
		return await this.gitHubApi.discover(req.user, payload);
	}

	/** Imports the chosen skills from GitHub at the commit that discover returned. */
	@Post('/github/import')
	async importGitHub(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: ImportGitHubSkillsDto,
	) {
		return await this.gitHubApi.import(req.user, payload);
	}

	@Get('/:skillId/github/update')
	async getGitHubUpdate(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('skillId') skillId: string,
	) {
		return await this.gitHubApi.getUpdate(req.user, skillId);
	}

	@Post('/:skillId/github/update/accept')
	async acceptGitHubUpdate(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('skillId') skillId: string,
		@Body payload: AcceptSkillGitUpdateDto,
	) {
		return await this.gitHubApi.accept(req.user, skillId, payload);
	}

	@Post('/:skillId/github/update/skip')
	async skipGitHubUpdate(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('skillId') skillId: string,
		@Body payload: SkipSkillGitUpdateDto,
	) {
		await this.gitHubApi.skip(req.user, skillId, payload);
		return { ok: true };
	}

	/** Checks GitHub for this skill now and returns the skill as the list shows it. */
	@Post('/:skillId/github/check')
	async checkGitHub(req: AuthenticatedRequest, _res: Response, @Param('skillId') skillId: string) {
		return await this.gitHubApi.checkNow(req.user, skillId);
	}

	/** Stop syncing: the skill and its versions stay and become editable. */
	@Delete('/:skillId/github')
	async stopGitHubSync(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('skillId') skillId: string,
	) {
		await this.gitHubApi.stopSyncing(req.user, skillId);
		return { ok: true };
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
