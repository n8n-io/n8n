import {
	AcceptSkillUpdatesDto,
	ConnectSkillSourceDto,
	ReviewSkillUpdateDto,
	DiscoverSkillSourceDto,
	ListSkillSourceCredentialsQueryDto,
	ListSkillSourceRepositoriesQueryDto,
} from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, Middleware, Param, Post, Query, RestController } from '@n8n/decorators';
import type { NextFunction, Response } from 'express';

import { SkillSourceService } from '../services/skill-source.service';
import { SkillSyncFlagGate } from '../services/skill-sync-flag-gate';
import { SkillSyncService } from '../services/skill-sync.service';

/**
 * Skill Sync: connect a source, import its skills, check a source for updates, and stop syncing
 * one skill. The services check
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

	/** The sources that the user can see, for the Sources tab. */
	@Get('/')
	async list(req: AuthenticatedRequest) {
		return await this.skillSourceService.list(req.user);
	}

	/** The "Updates from" dialog: the updates of one source that wait for review. */
	@Get('/:sourceId/updates')
	async updates(req: AuthenticatedRequest, _res: Response, @Param('sourceId') sourceId: string) {
		return await this.skillSyncService.listUpdates(req.user, sourceId);
	}

	/** Update all: accepts each reviewed update of the source that is not blocked. */
	@Post('/:sourceId/updates/accept')
	async acceptAll(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('sourceId') sourceId: string,
		@Body payload: AcceptSkillUpdatesDto,
	) {
		return await this.skillSyncService.acceptAll(req.user, sourceId, payload);
	}

	/** The review of the update of one synced skill. */
	@Get('/skills/:skillId/update')
	async update(req: AuthenticatedRequest, _res: Response, @Param('skillId') skillId: string) {
		return await this.skillSyncService.getUpdate(req.user, skillId);
	}

	/** Accept: the reviewed update becomes the next version of the skill. */
	@Post('/skills/:skillId/update/accept')
	async accept(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('skillId') skillId: string,
		@Body payload: ReviewSkillUpdateDto,
	) {
		return await this.skillSyncService.accept(req.user, skillId, payload);
	}

	/** Skip: hides the update until the source changes again. */
	@Post('/skills/:skillId/update/skip')
	async skip(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('skillId') skillId: string,
		@Body payload: ReviewSkillUpdateDto,
	) {
		await this.skillSyncService.skip(req.user, skillId, payload);
		return { ok: true };
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

	/**
	 * Stop syncing one skill: it becomes a normal skill that n8n can edit, and keeps its
	 * versions. It cannot be undone.
	 */
	@Post('/skills/:skillId/stop-syncing')
	async stopSyncing(req: AuthenticatedRequest, _res: Response, @Param('skillId') skillId: string) {
		await this.skillSyncService.stopSyncing(req.user, skillId);
		return { ok: true };
	}

	/**
	 * Check now: checks the whole source of a synced skill for updates, as the hourly check
	 * does. A source checked less than a minute ago is not checked again.
	 */
	@Post('/skills/:skillId/check')
	async checkNow(req: AuthenticatedRequest, _res: Response, @Param('skillId') skillId: string) {
		return await this.skillSyncService.checkNow(req.user, skillId);
	}
}
