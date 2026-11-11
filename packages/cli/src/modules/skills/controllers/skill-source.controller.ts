import {
	AcceptSkillSourceUpdatesDto,
	ReviewSkillSourceUpdateQueryDto,
	SkipSkillSourceUpdateDto,
	SkillSourceCommitQueryDto,
	ConnectSkillSourceDto,
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
 * Skill Sync: connect, import, check, review updates and stop syncing.
 * The services also check the per-user flag for callers outside this controller.
 * No route scope: the scope of the source decides who may change it.
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

	/**
	 * Stop syncing one skill: it becomes a normal skill that n8n can edit, and keeps its
	 * versions. It cannot be undone.
	 */
	@Post('/skills/:skillId/stop-syncing')
	async stopSyncing(req: AuthenticatedRequest, _res: Response, @Param('skillId') skillId: string) {
		await this.skillSyncService.stopSyncing(req.user, skillId);
		return { ok: true };
	}

	/** The sources that the user can see, each with its counts, for its row in the skills table. */
	@Get('/')
	async list(req: AuthenticatedRequest) {
		return await this.skillSourceService.list(req.user);
	}

	/**
	 * Check for updates: checks the source, as the hourly check does. A source checked less
	 * than a minute ago is not checked again.
	 */
	@Post('/:sourceId/check')
	async checkNow(req: AuthenticatedRequest, _res: Response, @Param('sourceId') sourceId: string) {
		return await this.skillSyncService.checkNow(req.user, sourceId);
	}

	@Get('/:sourceId/updates')
	async updates(req: AuthenticatedRequest, _res: Response, @Param('sourceId') sourceId: string) {
		return await this.skillSyncService.listUpdates(req.user, sourceId);
	}

	@Get('/:sourceId/updates/:skillId')
	async reviewUpdate(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('sourceId') sourceId: string,
		@Param('skillId') skillId: string,
		@Query query: ReviewSkillSourceUpdateQueryDto,
	) {
		return await this.skillSyncService.reviewUpdate(req.user, sourceId, skillId, query);
	}

	@Get('/:sourceId/commit')
	async commit(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('sourceId') sourceId: string,
		@Query query: SkillSourceCommitQueryDto,
	) {
		return await this.skillSyncService.describeUpdateCommit(req.user, sourceId, query.revision);
	}

	@Post('/:sourceId/updates/accept')
	async acceptUpdates(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('sourceId') sourceId: string,
		@Body payload: AcceptSkillSourceUpdatesDto,
	) {
		return await this.skillSyncService.acceptUpdates(req.user, sourceId, payload);
	}

	@Post('/:sourceId/updates/:skillId/skip')
	async skipUpdate(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('sourceId') sourceId: string,
		@Param('skillId') skillId: string,
		@Body payload: SkipSkillSourceUpdateDto,
	) {
		await this.skillSyncService.skipUpdate(req.user, sourceId, skillId, payload.contentHash);
		return { ok: true };
	}
}
