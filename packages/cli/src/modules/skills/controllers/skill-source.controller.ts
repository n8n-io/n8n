import { ConnectSkillSourceDto, DiscoverSkillSourceDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Middleware, Param, Post, RestController } from '@n8n/decorators';
import type { NextFunction, Request, Response } from 'express';

import { SkillSourceService } from '../services/skill-source.service';
import { SkillSyncService } from '../services/skill-sync.service';
import { SkillsGate } from '../services/skills-gate';

/**
 * Skill Sync: connect a source and import its skills. Every route also checks the per-user
 * Skill Sync flag in `SkillSourceService`, which answers 404 when it is off. No route scope:
 * the scope of the source decides who may connect it.
 */
@RestController('/skill-sources')
export class SkillSourceController {
	constructor(
		private readonly skillSourceService: SkillSourceService,
		private readonly skillSyncService: SkillSyncService,
		private readonly skillsGate: SkillsGate,
	) {}

	/** Runs before the request is validated, so every request answers 404 while skills are off. */
	@Middleware()
	requireSkillsEnabled(_req: Request, res: Response, next: NextFunction) {
		if (!this.skillsGate.isEnabled) {
			res.status(404).send('Not found');
			return;
		}
		next();
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
}
