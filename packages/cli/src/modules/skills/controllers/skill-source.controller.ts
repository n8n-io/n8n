import {
	AddSkillSourceSkillsDto,
	ConnectSkillSourceDto,
	DiscoverSkillSourceDto,
	ListSkillSourceCredentialsQueryDto,
	ListSkillSourceRepositoriesQueryDto,
} from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Delete, Get, Middleware, Param, Post, Query, RestController } from '@n8n/decorators';
import type { NextFunction, Response } from 'express';

import { SkillSourceService } from '../services/skill-source.service';
import { SkillSyncFlagGate } from '../services/skill-sync-flag-gate';
import { SkillSyncService } from '../services/skill-sync.service';

/**
 * Skill Sync: connect a source, import its skills, and stop syncing one skill. The services check
 * the per-user Skill Sync flag again, for callers other than this controller. No route scope: the
 * scope of the source decides who may change it.
 */
@RestController('/skill-sources')
export class SkillSourceController {
	constructor(
		private readonly skillSourceService: SkillSourceService,
		private readonly skillSyncService: SkillSyncService,
		private readonly flagGate: SkillSyncFlagGate,
	) {}

	/**
	 * Runs before the request is validated, so every request answers 404 while skills or the
	 * Skill Sync flag of the user are off.
	 */
	@Middleware()
	async requireSkillSyncEnabled(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		if (!(await this.flagGate.isEnabled(req.user))) {
			res.status(404).send('Not found');
			return;
		}
		next();
	}

	/** The credentials that can read a private source in the scope, for the credential select. */
	@Get('/credentials')
	async credentials(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: ListSkillSourceCredentialsQueryDto,
	) {
		return await this.skillSourceService.listCredentials(req.user, query);
	}

	/** The repositories that a credential can read, to pick one in place of a link. */
	@Get('/repositories')
	async repositories(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: ListSkillSourceRepositoriesQueryDto,
	) {
		return await this.skillSourceService.listRepositories(req.user, query);
	}

	/** Reads a link and lists its skills for the picker. Writes nothing. */
	@Post('/discover')
	async discover(req: AuthenticatedRequest, _res: Response, @Body payload: DiscoverSkillSourceDto) {
		return await this.skillSourceService.discover(req.user, payload);
	}

	/** Connects the source in the chosen scope and imports the picked skills. */
	@Post('/')
	async connect(req: AuthenticatedRequest, _res: Response, @Body payload: ConnectSkillSourceDto) {
		return await this.skillSourceService.connect(req.user, payload);
	}

	/** Access follows the source's stored project, through SkillAccessService in the service. */
	@Get('/')
	async list(req: AuthenticatedRequest) {
		return await this.skillSourceService.list(req.user);
	}

	@Post('/:sourceId/discover')
	async discoverMore(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('sourceId') sourceId: string,
	) {
		return await this.skillSourceService.discoverMore(req.user, sourceId);
	}

	/** Counts the skills that the source gained since the user last saw its import picker. */
	@Post('/:sourceId/check')
	async check(req: AuthenticatedRequest, _res: Response, @Param('sourceId') sourceId: string) {
		return await this.skillSourceService.checkNewSkills(req.user, sourceId);
	}

	@Post('/:sourceId/skills')
	async addSkills(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('sourceId') sourceId: string,
		@Body payload: AddSkillSourceSkillsDto,
	) {
		return await this.skillSourceService.addSkills(req.user, sourceId, payload);
	}

	/**
	 * Stop syncing one skill: it becomes a normal skill that n8n can edit, and keeps its
	 * versions. It cannot be undone.
	 */
	/** Deletes a source with no skills left. The service checks the scope of the source. */
	@Delete('/:sourceId')
	async delete(req: AuthenticatedRequest, _res: Response, @Param('sourceId') sourceId: string) {
		await this.skillSourceService.deleteEmpty(req.user, sourceId);
	}

	@Post('/skills/:skillId/stop-syncing')
	async stopSyncing(req: AuthenticatedRequest, _res: Response, @Param('skillId') skillId: string) {
		await this.skillSyncService.stopSyncing(req.user, skillId);
		return { ok: true };
	}
}
